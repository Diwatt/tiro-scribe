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
        capture: vi.fn<(durationMs: number) => Promise<string>>(),
        getPcm: vi.fn<() => Promise<Float32Array>>(),
    },
    runtime: {
        load: vi.fn<(capability: string) => Promise<void>>(),
        run: vi.fn(),
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
            // Handle OnnxRuntime
            if (token && token.name === 'OnnxRuntime') {
                return mocks.runtime;
            }
            // Provide a fake AppConfig for other factories
            if (token && token.name === 'AppConfig') {
                return { voiceCalibrationDurationMs: 5000 } as any;
            }
            return undefined;
        }),
        logger: mocks.logger,
        inMemoryAudioRecorder: mocks.recorder,
        onnxRuntime: mocks.runtime,
    },
}));

import { VoiceCalibrator } from '@/Service/SpeakerId/VoiceCalibrator';
import { Biocode } from '@/Service/SpeakerId/Biocode';
import { SpeakerVector } from '@/Service/SpeakerId/SpeakerVector';
import { RecordingTooShortError } from '@/Exception/RecordingTooShortError';
import { SecureRecorder } from 'secure-recorder';

dayjs.extend(utc);

type DownloaderConfig = { files: { url: string }[] };

const { logger: mockLogger, recorder: mockRecorder, runtime: mockRuntime } = mocks;


const defaultSpeakerVector = new SpeakerVector([0.1, 0.2, 0.3], 0.9);
const mockBiocode = new Biocode([0.5, 0.4, 0.3], defaultSpeakerVector.confidence, dayjs.utc());

const mockSpeakerEmbedder = {
    extract: vi.fn<(pcm: Float32Array) => Promise<SpeakerVector>>(),
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
        mockRuntime as any,
        mockBiocodeFactory as any,
        mockLogger as any,
        mockProjectionMatrixFactory as any,
    );

describe('VoiceCalibrator – ZOMBIE tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // ensure runtime.load resolves by default so later tests don't inherit a
        // rejection from the 'Zero' case.
        mockRuntime.load.mockResolvedValue(undefined);

        // default capture should return a file path; the PCM is provided via getPcm.
        mockRecorder.capture.mockResolvedValue('/tmp/fake-recording.enc');
        mockRecorder.getPcm.mockResolvedValue(new Float32Array(80000));
        mockSpeakerEmbedder.extract.mockResolvedValue(defaultSpeakerVector);
        mockBiocodeFactory.create.mockReturnValue(mockBiocode);
        // projection factory should always return some matrix to avoid undefined
        mockProjectionMatrixFactory.create.mockReturnValue([[1, 0], [0, 1]]);

    });

    it('Zero – propagates load failure', async () => {
        mockRuntime.load.mockRejectedValue(new Error('Speaker ID artifact path unavailable'));

        const calibrator = createCalibrator();

        await expect(calibrator.generateBiocode('some-key', new Float32Array([0]))).rejects.toThrow(
            'Speaker ID artifact path unavailable',
        );
        expect(mockRuntime.load).toHaveBeenCalledWith('speaker_id');
    });

    it('One – captures and generates a biocode', async () => {
        const calibrator = createCalibrator();
        const pcm = await calibrator.captureVoiceSample(5000);
        const result = await calibrator.generateBiocode('master-key-1', pcm);

        expect(result).toBe(mockBiocode);
        expect(mockRecorder.capture).toHaveBeenCalledTimes(1);
        expect(mockRecorder.getPcm).toHaveBeenCalledTimes(1);
        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, expect.any(Array));
        expect(mockRuntime.load).toHaveBeenCalledWith('speaker_id');
    });

    it('Many – consecutive runs capture and project each time', async () => {
        const calibrator = createCalibrator();

        await calibrator.captureVoiceSample(1000);
        await calibrator.generateBiocode('key1', new Float32Array([0]));

        await calibrator.captureVoiceSample(1000);
        await calibrator.generateBiocode('key2', new Float32Array([0]));

        expect(mockRecorder.capture).toHaveBeenCalledTimes(2);
        expect(mockRuntime.load).toHaveBeenCalledTimes(1);
        expect(mockBiocodeFactory.create).toHaveBeenCalledTimes(2);
    });

    it('Boundary – respects configured calibration duration', async () => {
        const durationMs = 1234;
        const calibrator = createCalibrator();

        await calibrator.captureVoiceSample(durationMs);

        expect(mockRecorder.capture).toHaveBeenCalledWith(durationMs);
    });

    it('captureVoiceSample – records and returns PCM', async () => {
        const calibrator = createCalibrator();
        const pcm = await calibrator.captureVoiceSample(2500);

        expect(mockRecorder.capture).toHaveBeenCalledWith(2500);
        expect(mockRecorder.getPcm).toHaveBeenCalled();
        expect(pcm.length).toBe(80000);
    });

    it('generateBiocode – runs model and projects to biocode', async () => {
        const calibrator = createCalibrator();
        const pcm = new Float32Array([0.1, 0.2, 0.3]);

        const biocode = await calibrator.generateBiocode('some-master-key', pcm);

        expect(mockRuntime.load).toHaveBeenCalledWith('speaker_id');
        expect(mockSpeakerEmbedder.extract).toHaveBeenCalledWith(pcm);
        expect(mockProjectionMatrixFactory.create).toHaveBeenCalledWith(
            'some-master-key',
            defaultSpeakerVector.vector.length,
        );
        expect(biocode).toBe(mockBiocode);
    });

    it('Short – propagates RecordingTooShortError from recorder', async () => {
        const err = new RecordingTooShortError(80000, 5000);
        mockRecorder.getPcm.mockRejectedValueOnce(err);

        const calibrator = createCalibrator();
        await expect(calibrator.captureVoiceSample(1000)).rejects.toBe(err);
        expect(mockRuntime.load).not.toHaveBeenCalled();

        expect(mockLogger.error).toHaveBeenCalledWith(
            '[VoiceCalibrator] captureVoiceSample failed',
            expect.objectContaining({ error: err }),
        );
    });

    // legacy interface test removed; only master key path supported now


    it('MasterKey – generates projection matrix based on vector length', async () => {
        const fakeMatrix = [[9, 9], [9, 9]];
        mockProjectionMatrixFactory.create.mockReturnValue(fakeMatrix);

        const calibrator = createCalibrator();
        const pcm = new Float32Array([0.1, 0.2, 0.3]);
        const biocode = await calibrator.generateBiocode('some-master-key', pcm);

        expect(mockProjectionMatrixFactory.create).toHaveBeenCalledWith('some-master-key', defaultSpeakerVector.vector.length);
        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, fakeMatrix);
        expect(biocode).toBe(mockBiocode);
        expect(mockRuntime.load).toHaveBeenCalled();
    });


    it('Exception – propagates microphone capture failures', async () => {
        const error = new Error('microphone unavailable');
        mockRecorder.capture.mockRejectedValueOnce(error);

        const calibrator = createCalibrator();

        await expect(calibrator.captureVoiceSample(1000)).rejects.toThrow(error);
        expect(mockRuntime.load).not.toHaveBeenCalled();
    });
});
