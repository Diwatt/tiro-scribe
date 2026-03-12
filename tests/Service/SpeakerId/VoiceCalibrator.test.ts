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
const mockBiocode = new Biocode([0.5, 0.4, 0.3], 0.95, dayjs.utc());

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

        // default capture should produce the expected number of samples for a
        // 5-second session (16kHz * 5s = 80 000 samples).  Use zeros since
        // the actual content is irrelevant.
        mockRecorder.capture.mockResolvedValue(new Float32Array(80000));
        mockSpeakerEmbedder.extract.mockResolvedValue(defaultSpeakerVector);
        mockBiocodeFactory.create.mockReturnValue(mockBiocode);
        // projection factory should always return some matrix to avoid undefined
        mockProjectionMatrixFactory.create.mockReturnValue([[1, 0], [0, 1]]);

    });

    it('Zero – propagates load failure', async () => {
        mockRuntime.load.mockRejectedValue(new Error('Speaker ID artifact path unavailable'));

        const calibrator = createCalibrator();

        await expect(calibrator.run('some-key')).rejects.toThrow('Speaker ID artifact path unavailable');
        expect(mockRuntime.load).toHaveBeenCalledWith('speaker_id');
    });

    it('One – returns Biocode for a single successful capture using master key', async () => {
        const calibrator = createCalibrator();
        const result = await calibrator.run('master-key-1');

        expect(result).toBe(mockBiocode);
        expect(mockRecorder.capture).toHaveBeenCalledTimes(1);
        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, expect.any(Array));
        expect(mockRuntime.load).toHaveBeenCalledWith('speaker_id');

        // verify basic logging
        expect(mockLogger.info).toHaveBeenCalledWith(
            '[VoiceCalibrator] Starting voice calibration',
            expect.objectContaining({ durationMs: 5000 }),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
            '[VoiceCalibrator] Audio capture complete',
            expect.objectContaining({ pcmLength: 80000 }),
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
            '[VoiceCalibrator] Voice calibration complete',
            expect.objectContaining({ confidence: defaultSpeakerVector.confidence }),
        );
    });

    it('Many – consecutive runs capture and project each time', async () => {
        const calibrator = createCalibrator();

        await calibrator.run('key1');
        await calibrator.run('key2');

        expect(mockRecorder.capture).toHaveBeenCalledTimes(2);
        expect(mockRuntime.load).toHaveBeenCalledTimes(1);
        expect(mockBiocodeFactory.create).toHaveBeenCalledTimes(2);
    });

    it('Boundary – respects configured calibration duration', async () => {
        const durationMs = 1234;
        const calibrator = createCalibrator();

        await calibrator.run('some-key', durationMs);

        expect(mockRecorder.capture).toHaveBeenCalledWith(durationMs);
    });

    it('Short – propagates RecordingTooShortError from recorder', async () => {
        const err = new RecordingTooShortError(80000, 5000);
        mockRecorder.capture.mockRejectedValueOnce(err);

        const calibrator = createCalibrator();
        await expect(calibrator.run('any-key')).rejects.toBe(err);
        // model initialization (load) still happens before capture
        expect(mockRuntime.load).toHaveBeenCalled();

        expect(mockLogger.error).toHaveBeenCalledWith(
            '[VoiceCalibrator] Voice calibration failed',
            expect.objectContaining({ error: err }),
        );
    });

    // legacy interface test removed; only master key path supported now


    it('MasterKey – generates projection matrix based on vector length', async () => {
        const fakeMatrix = [[9, 9], [9, 9]];
        mockProjectionMatrixFactory.create.mockReturnValue(fakeMatrix);

        const calibrator = createCalibrator();
        const biocode = await calibrator.run('some-master-key');

        expect(mockProjectionMatrixFactory.create).toHaveBeenCalledWith('some-master-key', defaultSpeakerVector.vector.length);
        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, fakeMatrix);
        expect(biocode).toBe(mockBiocode);
        expect(mockRuntime.load).toHaveBeenCalled();
    });


    it('Exception – propagates microphone capture failures', async () => {
        const error = new Error('microphone unavailable');
        mockRecorder.capture.mockRejectedValueOnce(error);

        const calibrator = createCalibrator();

        await expect(calibrator.run('whatever')).rejects.toThrow(error);
        expect(mockRuntime.load).toHaveBeenCalled();
    });
});
