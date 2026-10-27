import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { RecordingTooShortError } from '@/Exception/RecordingTooShortError';
import { VoiceCalibrator } from '@/InferenceModel/Speaker/VoiceCalibrator';
import { Biocode } from '@/InferenceModel/Speaker/Biocode';
import { SpeakerVector } from '@/InferenceModel/Speaker/SpeakerVector';

const mockLoggerFns = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
};

const mockRecorderFns = {
    capture: jest.fn<Promise<string>, [durationMs: number]>(),
    getPcm: jest.fn<Promise<Float32Array>, []>(),
};

const mockRuntimeFns = {
    load: jest.fn<Promise<void>, [capability: string]>(),
    run: jest.fn(),
};

dayjs.extend(utc);

type DownloaderConfig = { files: { url: string }[] };

const defaultSpeakerVector = new SpeakerVector([0.1, 0.2, 0.3], 0.9);
const mockBiocode = new Biocode([0.5, 0.4, 0.3], defaultSpeakerVector.confidence, dayjs.utc());

const mockSpeakerEmbedder = {
    extract: jest.fn<Promise<SpeakerVector>, [pcm: Float32Array]>(),
};

const mockBiocodeFactory = {
    create: jest.fn<Biocode, [vector: SpeakerVector, matrix: number[][]]>(),
};

const mockProjectionMatrixFactory = {
    create: jest.fn<number[][], [masterKey: string, inputDim: number]>(),
};

const createCalibrator = (): VoiceCalibrator =>
    new VoiceCalibrator(
        mockRecorderFns as any,
        mockSpeakerEmbedder as any,
        mockRuntimeFns as any,
        mockBiocodeFactory as any,
        mockLoggerFns as any,
        mockProjectionMatrixFactory as any,
    );

describe('VoiceCalibrator – ZOMBIE tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // ensure runtime.load resolves by default so later tests don't inherit a
        // rejection from the 'Zero' case.
        mockRuntimeFns.load.mockResolvedValue(undefined);

        // default capture should return a file path; the PCM is provided via getPcm.
        mockRecorderFns.capture.mockResolvedValue('/tmp/fake-recording.enc');
        mockRecorderFns.getPcm.mockResolvedValue(new Float32Array(80000));
        mockSpeakerEmbedder.extract.mockResolvedValue(defaultSpeakerVector);
        mockBiocodeFactory.create.mockReturnValue(mockBiocode);
        // projection factory should always return some matrix to avoid undefined
        mockProjectionMatrixFactory.create.mockReturnValue([[1, 0], [0, 1]]);

    });

    it('Zero – propagates load failure', async () => {
        mockRuntimeFns.load.mockRejectedValue(new Error('Speaker ID artifact path unavailable'));

        const calibrator = createCalibrator();

        await expect(calibrator.generateBiocode('some-key', new Float32Array([0]))).rejects.toThrow(
            'Speaker ID artifact path unavailable',
        );
        expect(mockRuntimeFns.load).toHaveBeenCalledWith('speaker_id');
    });

    it('One – captures and generates a biocode', async () => {
        const calibrator = createCalibrator();
        const pcm = await calibrator.captureVoiceSample(5000);
        const result = await calibrator.generateBiocode('master-key-1', pcm);

        expect(result).toBe(mockBiocode);
        expect(mockRecorderFns.capture).toHaveBeenCalledTimes(1);
        expect(mockRecorderFns.getPcm).toHaveBeenCalledTimes(1);
        expect(mockBiocodeFactory.create).toHaveBeenCalledWith(defaultSpeakerVector, expect.any(Array));
        expect(mockRuntimeFns.load).toHaveBeenCalledWith('speaker_id');
    });

    it('Many – consecutive runs capture and project each time', async () => {
        const calibrator = createCalibrator();

        await calibrator.captureVoiceSample(1000);
        await calibrator.generateBiocode('key1', new Float32Array([0]));

        await calibrator.captureVoiceSample(1000);
        await calibrator.generateBiocode('key2', new Float32Array([0]));

        expect(mockRecorderFns.capture).toHaveBeenCalledTimes(2);
        expect(mockRuntimeFns.load).toHaveBeenCalledTimes(1);
        expect(mockBiocodeFactory.create).toHaveBeenCalledTimes(2);
    });

    it('Boundary – respects configured calibration duration', async () => {
        const durationMs = 1234;
        const calibrator = createCalibrator();

        await calibrator.captureVoiceSample(durationMs);

        expect(mockRecorderFns.capture).toHaveBeenCalledWith(durationMs);
    });

    it('captureVoiceSample – records and returns PCM', async () => {
        const calibrator = createCalibrator();
        const pcm = await calibrator.captureVoiceSample(2500);

        expect(mockRecorderFns.capture).toHaveBeenCalledWith(2500);
        expect(mockRecorderFns.getPcm).toHaveBeenCalled();
        expect(pcm.length).toBe(80000);
    });

    it('generateBiocode – runs model and projects to biocode', async () => {
        const calibrator = createCalibrator();
        const pcm = new Float32Array([0.1, 0.2, 0.3]);

        const biocode = await calibrator.generateBiocode('some-master-key', pcm);

        expect(mockRuntimeFns.load).toHaveBeenCalledWith('speaker_id');
        expect(mockSpeakerEmbedder.extract).toHaveBeenCalledWith(pcm);
        expect(mockProjectionMatrixFactory.create).toHaveBeenCalledWith(
            'some-master-key',
            defaultSpeakerVector.vector.length,
        );
        expect(biocode).toBe(mockBiocode);
    });

    it('Short – propagates RecordingTooShortError from recorder', async () => {
        const err = new RecordingTooShortError(80000, 5000);
        mockRecorderFns.getPcm.mockRejectedValueOnce(err);

        const calibrator = createCalibrator();
        await expect(calibrator.captureVoiceSample(1000)).rejects.toBe(err);
        expect(mockRuntimeFns.load).not.toHaveBeenCalled();

        expect(mockLoggerFns.error).toHaveBeenCalledWith(
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
        expect(mockRuntimeFns.load).toHaveBeenCalled();
    });


    it('Exception – propagates microphone capture failures', async () => {
        const error = new Error('microphone unavailable');
        mockRecorderFns.capture.mockRejectedValueOnce(error);

        const calibrator = createCalibrator();

        await expect(calibrator.captureVoiceSample(1000)).rejects.toThrow(error);
        expect(mockRuntimeFns.load).not.toHaveBeenCalled();
    });
});