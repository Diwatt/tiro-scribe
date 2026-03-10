import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
    recorder: {
        capture: vi.fn<(durationMs: number) => Promise<Float32Array>>(),
    },
    downloader: {
        // downloader mocks remain for any indirect calls via SpeakerEmbedder
        download: vi.fn<(capability: string) => Promise<{ config: DownloaderConfig }>>(),
        getLocalPath: vi.fn<(capability: string) => string | undefined>(),
        getLocalPathForFile: vi.fn<
            (config: DownloaderConfig, file: DownloaderConfig['files'][number]) => string | undefined
        >(),
        getConfig: vi.fn<(capability: string) => Promise<DownloaderConfig>>(),
    },
}));

// mock container before any service imports occur
vi.mock('@/Core/Container', () => ({
    Container: {
        register: vi.fn(),
        get: vi.fn((token: any) => {
            // Handle InMemoryAudioRecorder
            if (token && token.name === 'InMemoryAudioRecorder') {
                return mocks.recorder;
            }
            // Handle InferenceModelDownloader
            if (token && token.name === 'InferenceModelDownloader') {
                return mocks.downloader;
            }
            // Provide a fake AppConfig so the downloader factory won't blow up
            if (token && token.name === 'AppConfig') {
                return { voiceCalibrationDurationMs: 5000 } as any;
            }
            return undefined;
        }),
        logger: mocks.logger,
        inMemoryAudioRecorder: mocks.recorder,
        inferenceModelDownloader: mocks.downloader,
    },
}));

import { VoiceCalibrator } from '@/Service/SpeakerId/VoiceCalibrator';
import { Biocode } from '@/Service/SpeakerId/Biocode';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';
import { SecureRecorder } from 'secure-recorder';

dayjs.extend(utc);

type DownloaderConfig = { files: { url: string }[] };

const { logger: mockLogger, recorder: mockRecorder, downloader: mockDownloader } = mocks;

const projectionMatrix: number[][] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
];

const defaultSpeakerVector = new SpeakerVector([0.1, 0.2, 0.3], 0.9);
const mockBiocode = new Biocode([0.5, 0.4, 0.3], 0.95, dayjs.utc());

const mockSpeakerEmbedder = {
    extract: vi.fn<(pcm: Float32Array) => Promise<SpeakerVector>>(),
    initialize: vi.fn<(path: string) => Promise<void>>(),
    loadModel: vi.fn<(capability: string) => Promise<void>>(),
};

const mockBiocodeFactory = {
    create: vi.fn<(vector: SpeakerVector, matrix: number[][]) => Biocode>(),
};

const mockProjectionMatrixFactory = {
    create: vi.fn<(masterKey: string, inputDim: number) => number[][]>(),
};

const createCalibrator = (): VoiceCalibrator =>
    new VoiceCalibrator(
        mockRecorder as any,
        mockSpeakerEmbedder as any,
        mockBiocodeFactory as any,
        mockLogger as any,
        mockProjectionMatrixFactory as any,
    );

describe('VoiceCalibrator – ZOMBIE tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRecorder.capture.mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]));
        mockSpeakerEmbedder.loadModel.mockResolvedValue();
        mockSpeakerEmbedder.initialize.mockResolvedValue();
        mockSpeakerEmbedder.extract.mockResolvedValue(defaultSpeakerVector);
        mockBiocodeFactory.create.mockReturnValue(mockBiocode);
    });

    it('Zero – throws when no artifact path can be determined', async () => {
        mockSpeakerEmbedder.loadModel.mockRejectedValue(new Error('Speaker ID artifact path unavailable'));

        const calibrator = createCalibrator();

        await expect(calibrator.run(projectionMatrix)).rejects.toThrow('Speaker ID artifact path unavailable');
        expect(mockSpeakerEmbedder.initialize).not.toHaveBeenCalled();
    });

    it('One – returns Biocode for a single successful capture', async () => {
        const calibrator = createCalibrator();
        const result = await calibrator.run(projectionMatrix);

        expect(result).toBe(mockBiocode);
        expect(mockRecorder.capture).toHaveBeenCalledTimes(1);
        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, projectionMatrix);
        expect(mockSpeakerEmbedder.loadModel).toHaveBeenCalledWith('speaker_id');
    });

    it('Many – consecutive runs capture and project each time', async () => {
        const calibrator = createCalibrator();

        await calibrator.run(projectionMatrix);
        await calibrator.run(projectionMatrix);

        expect(mockRecorder.capture).toHaveBeenCalledTimes(2);
        expect(mockSpeakerEmbedder.loadModel).toHaveBeenCalledTimes(2);
        expect(mockBiocodeFactory.create).toHaveBeenCalledTimes(2);
    });

    it('Boundary – respects configured calibration duration', async () => {
        const durationMs = 1234;
        const calibrator = createCalibrator();

        await calibrator.run(projectionMatrix, durationMs);

        expect(mockRecorder.capture).toHaveBeenCalledWith(durationMs);
    });

    it('Short – warns when the recorded PCM length is much lower than expected', async () => {
        // if we request 5000ms at 16kHz we expect ~80_000 samples; return only 5k
        mockRecorder.capture.mockResolvedValueOnce(new Float32Array(5000));

        const calibrator = createCalibrator();
        await calibrator.run(projectionMatrix);

        expect(mockLogger.warn).toHaveBeenCalledWith(
            '[VoiceCalibrator] captured much less audio than expected',
            expect.objectContaining({ requestedMs: 5000 }),
        );
    });

    it('Interface – feeds extracted speaker vector into BiocodeFactory with projection matrix', async () => {
        const calibrator = createCalibrator();
        await calibrator.run(projectionMatrix);

        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, projectionMatrix);
    });

    it('MasterKey – generates projection matrix based on vector length', async () => {
        const fakeMatrix = [[9, 9], [9, 9]];
        mockProjectionMatrixFactory.create.mockReturnValue(fakeMatrix);

        const calibrator = createCalibrator();
        const biocode = await calibrator.run('some-master-key');

        expect(mockProjectionMatrixFactory.create).toHaveBeenCalledWith('some-master-key', defaultSpeakerVector.vector.length);
        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, fakeMatrix);
        expect(biocode).toBe(mockBiocode);
    });


    it('Exception – propagates microphone capture failures', async () => {
        const error = new Error('microphone unavailable');
        mockRecorder.capture.mockRejectedValueOnce(error);

        const calibrator = createCalibrator();

        await expect(calibrator.run(projectionMatrix)).rejects.toThrow(error);
        expect(mockSpeakerEmbedder.loadModel).toHaveBeenCalled();
        expect(mockSpeakerEmbedder.initialize).not.toHaveBeenCalled();
    });
});
