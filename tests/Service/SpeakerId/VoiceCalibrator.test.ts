import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceCalibrator } from '@/Service/SpeakerId/VoiceCalibrator';
import { Biocode } from '@/Service/SpeakerId/Biocode';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';
import { SecureRecorder } from 'secure-recorder';

dayjs.extend(utc);

type DownloaderConfig = { files: { url: string }[] };

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
        download: vi.fn<(capability: string) => Promise<{ config: DownloaderConfig }>>(),
        getLocalPath: vi.fn<(capability: string) => string | undefined>(),
        getLocalPathForFile: vi.fn<
            (config: DownloaderConfig, file: DownloaderConfig['files'][number]) => string | undefined
        >(),
    },
}));

vi.mock('@/Container', () => ({
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
            return undefined;
        }),
        logger: mocks.logger,
        inMemoryAudioRecorder: mocks.recorder,
        inferenceModelDownloader: mocks.downloader,
    },
}));

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
};

const mockBiocodeFactory = {
    create: vi.fn<(vector: SpeakerVector, matrix: number[][]) => Biocode>(),
};

const createCalibrator = (): VoiceCalibrator =>
    new VoiceCalibrator(mockSpeakerEmbedder as any, mockBiocodeFactory as any, mockLogger as any);

describe('VoiceCalibrator – ZOMBIE tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRecorder.capture.mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]));
        mockDownloader.download.mockResolvedValue({ config: { files: [{ url: 'speaker.onnx' }] } });
        mockDownloader.getLocalPath.mockReturnValue('/tmp/speaker.onnx');
        mockDownloader.getLocalPathForFile.mockReturnValue('/tmp/speaker.onnx');
        mockSpeakerEmbedder.initialize.mockResolvedValue();
        mockSpeakerEmbedder.extract.mockResolvedValue(defaultSpeakerVector);
        mockBiocodeFactory.create.mockReturnValue(mockBiocode);
    });

    it('Zero – throws when no artifact path can be determined', async () => {
        mockDownloader.getLocalPath.mockReturnValue(undefined);
        mockDownloader.getLocalPathForFile.mockReturnValue(undefined);

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
    });

    it('Many – consecutive runs capture and project each time', async () => {
        const calibrator = createCalibrator();

        await calibrator.run(projectionMatrix);
        await calibrator.run(projectionMatrix);

        expect(mockRecorder.capture).toHaveBeenCalledTimes(2);
        expect(mockSpeakerEmbedder.initialize).toHaveBeenCalledTimes(2);
        expect(mockBiocodeFactory.create).toHaveBeenCalledTimes(2);
    });

    it('Boundary – respects configured calibration duration', async () => {
        const durationMs = 1234;
        const calibrator = createCalibrator(durationMs);

        await calibrator.run(projectionMatrix);

        expect(mockRecorder.capture).toHaveBeenCalledWith(durationMs);
    });

    it('Interface – feeds extracted speaker vector into BiocodeFactory with projection matrix', async () => {
        const calibrator = createCalibrator();
        await calibrator.run(projectionMatrix);

        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, projectionMatrix);
    });

    it('Permission – throws when recording permission denied', async () => {
        // ensure permission checks are invoked
        vi.spyOn(SecureRecorder, 'hasPermission').mockResolvedValue(false);
        vi.spyOn(SecureRecorder, 'requestPermission').mockResolvedValue(false);

        const calibrator = createCalibrator();
        await expect(calibrator.run(projectionMatrix)).rejects.toBeInstanceOf(RecordingPermissionError);
    });

    it('Exception – propagates microphone capture failures', async () => {
        const error = new Error('microphone unavailable');
        mockRecorder.capture.mockRejectedValueOnce(error);

        const calibrator = createCalibrator();

        await expect(calibrator.run(projectionMatrix)).rejects.toThrow(error);
        expect(mockSpeakerEmbedder.initialize).not.toHaveBeenCalled();
    });
});
