import * as Device from 'expo-device';
import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { VoiceCalibrationRecorder } from '@/Service/VoiceCalibrationRecorder';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';
import { RecordingTooShortError } from '@/Exception/RecordingTooShortError';
import { Timer } from '@/Util/Timer';

// simple logger stub, we only care that methods exist
const mockLogger: AppLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
};

describe('VoiceCalibrationRecorder', () => {
    let listenerCallback: (event: { data: Uint8Array; isLast: boolean }) => void;
    const fakeChunks: Uint8Array[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        listenerCallback = () => {};
        fakeChunks.length = 0;

        // Ensure Device.isDevice exists in the test environment so we can mock it.
        if (!Object.prototype.hasOwnProperty.call(Device, 'isDevice')) {
            Object.defineProperty(Device, 'isDevice', {
                get: () => true,
                configurable: true,
            });
        }

        // stub Timer.sleep so tests don't actually wait
        jest.spyOn(Timer, 'sleep').mockResolvedValue(undefined as any);

        // default permission granted
        jest.spyOn(SecureRecorder, 'hasPermission').mockResolvedValue(true);
        jest.spyOn(SecureRecorder, 'requestPermission').mockResolvedValue(true);

        jest.spyOn(SecureRecorder, 'addDecryptionListener').mockImplementation((cb) => {
            listenerCallback = cb as any;
            return { remove: () => {} };
        });

        jest.spyOn(SecureRecorder, 'stream').mockImplementation(async () => {
            // emit all fake chunks then a last event
            for (const data of fakeChunks) {
                listenerCallback({ data, isLast: false });
            }
            // final event
            listenerCallback({ data: new Uint8Array(0), isLast: true });
            return Promise.resolve();
        });
    });

    it('implements the interface and returns PCM when decryption produces 16‑bit samples', async () => {
        // produce 16 samples so a 1ms duration (expectedSamples=16) is satisfied
        const int16 = new Int16Array(16);
        int16[0] = 1;
        int16[1] = -1;
        // rest of values can be zero, we only assert first two positions
        fakeChunks.push(new Uint8Array(int16.buffer));

        const fakeRecorder = {
            initialize: jest.fn().mockResolvedValue(undefined),
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: jest.fn(),
        } as unknown as SecureRecorder;

        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);
        await recorder.capture(1); // 1ms -> 16 samples
        const pcm = await recorder.getPcm();

        expect(pcm).toBeInstanceOf(Float32Array);
        expect(pcm.length).toBe(16);
        // normalization: 1/32768 and -1/32768
        expect(pcm[0]).toBeCloseTo(1 / 32768);
        expect(pcm[1]).toBeCloseTo(-1 / 32768);

        // logger should have recorded session start and at least one decryption chunk
        expect(mockLogger.debug).toHaveBeenCalledWith(
            '[VoiceCalibrationRecorder] recording started',
            expect.objectContaining({ sessionId: expect.any(String) }),
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
            '[VoiceCalibrationRecorder] recording stopped',
            expect.objectContaining({ sessionId: expect.any(String), encryptedFilePath: expect.any(String) }),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
            '[VoiceCalibrationRecorder] decryption chunk',
            expect.objectContaining({ offsetBefore: expect.any(Number) }),
        );
    });

    it('throws RecordingPermissionError when permission denied', async () => {
        jest.spyOn(SecureRecorder, 'hasPermission').mockResolvedValue(false);
        jest.spyOn(SecureRecorder, 'requestPermission').mockResolvedValue(false);

        const fakeRecorder = {
            initialize: jest.fn().mockResolvedValue(undefined),
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: jest.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        await expect(recorder.capture(0)).rejects.toBeInstanceOf(RecordingPermissionError);
    });

    it('throws RecordingTooShortError when the recovered PCM is shorter than expected', async () => {
        // produce a single sample but request enough duration to require more
        const int16 = new Int16Array([0]);
        fakeChunks.push(new Uint8Array(int16.buffer));

        const fakeRecorder = {
            initialize: jest.fn().mockResolvedValue(undefined),
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: jest.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        // 1000ms -> expect 16000 samples, only one available
        await recorder.capture(1000);
        await expect(recorder.getPcm()).rejects.toBeInstanceOf(RecordingTooShortError);

        // error log should include file path and duration
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Voice calibration decryption failed.',
            expect.objectContaining({
                encryptedFilePath: expect.any(String),
                durationMs: 1000,
                error: expect.any(String),
            }),
        );
    });

    it('returns trimmed buffer when recording is slightly shorter but within tolerance', async () => {
        // choose a duration that yields 1600 expected samples
        const expectedSamples = (VoiceCalibrationRecorder as any).SAMPLE_RATE * 0.1; // 1600
        // produce 1450 samples (≈90.6% of expected)
        const int16 = new Int16Array(1450);
        int16[0] = 100;
        int16[1] = -100;
        fakeChunks.push(new Uint8Array(int16.buffer));

        const fakeRecorder = {
            initialize: jest.fn().mockResolvedValue(undefined),
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: jest.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        await recorder.capture(100); // 100ms -> 1600 samples expected
        const pcm = await recorder.getPcm();

        expect(pcm).toBeInstanceOf(Float32Array);
        expect(pcm.length).toBe(1450); // trimmed to actual samples
        // verify normalization applied to first two samples
        expect(pcm[0]).toBeCloseTo(100 / 32768);
        expect(pcm[1]).toBeCloseTo(-100 / 32768);
    });

    it('on simulator returns silent buffer instead of throwing', async () => {
        // make Device.isDevice false to simulate simulator environment
        Object.defineProperty(Device, 'isDevice', {
            get: () => false,
            configurable: true,
        });

        // no PCM chunks at all
        const fakeRecorder = {
            initialize: jest.fn().mockResolvedValue(undefined),
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: jest.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        const expectedSamples = (VoiceCalibrationRecorder as any).SAMPLE_RATE * 1; // 1s
        await recorder.capture(1000);
        const pcm = await recorder.getPcm();

        expect(pcm.length).toBe(expectedSamples);
        expect(Array.from(pcm).every((v) => v === 0)).toBe(true);
    });

    it('forwards errors from SecureRecorder.stream', async () => {
        const error = new Error('stream fail');
        // override the default stream mock for this test only
        (SecureRecorder as any).stream = jest.fn().mockRejectedValueOnce(error);

        const fakeRecorder = {
            initialize: jest.fn().mockResolvedValue(undefined),
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: jest.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        await recorder.capture(0);
        await expect(recorder.getPcm()).rejects.toThrow(error);
    });

});
