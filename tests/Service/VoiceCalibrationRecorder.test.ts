import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Device from 'expo-device';
import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { VoiceCalibrationRecorder } from '@/Service/VoiceCalibrationRecorder';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';
import { RecordingTooShortError } from '@/Exception/RecordingTooShortError';
import { Timer } from '@/Util/Timer';

// simple logger stub, we only care that methods exist
const mockLogger: AppLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
};

describe('VoiceCalibrationRecorder', () => {
    let listenerCallback: (event: { data: Uint8Array; isLast: boolean }) => void;
    const fakeChunks: Uint8Array[] = [];

    beforeEach(() => {
        vi.clearAllMocks();
        listenerCallback = () => {};
        fakeChunks.length = 0;

        // stub Timer.sleep so tests don't actually wait
        vi.spyOn(Timer, 'sleep').mockResolvedValue(undefined as any);

        // default permission granted
        vi.spyOn(SecureRecorder, 'hasPermission').mockResolvedValue(true);
        vi.spyOn(SecureRecorder, 'requestPermission').mockResolvedValue(true);

        vi.spyOn(SecureRecorder, 'addDecryptionListener').mockImplementation((cb) => {
            listenerCallback = cb as any;
            return { remove: () => {} };
        });

        vi.spyOn(SecureRecorder, 'stream').mockImplementation(async () => {
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
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: vi.fn(),
        } as unknown as SecureRecorder;

        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);
        const pcm = await recorder.capture(1); // 1ms -> 16 samples

        expect(pcm).toBeInstanceOf(Float32Array);
        expect(pcm.length).toBe(16);
        // normalization: 1/32768 and -1/32768
        expect(pcm[0]).toBeCloseTo(1 / 32768);
        expect(pcm[1]).toBeCloseTo(-1 / 32768);

        // logger should have recorded session start and at least one decryption chunk
        expect(mockLogger.debug).toHaveBeenCalledWith(
            '[VoiceCalibrationRecorder] recording started',
            expect.objectContaining({ sessionId: expect.any(String), startTs: expect.any(Number) }),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
            '[VoiceCalibrationRecorder] sleep complete',
            expect.objectContaining({ sessionId: expect.any(String), duration: expect.any(Number) }),
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
            '[VoiceCalibrationRecorder] recording stopped',
            expect.objectContaining({ sessionId: expect.any(String), stopTs: expect.any(Number), duration: expect.any(Number) }),
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
            '[VoiceCalibrationRecorder] decryption chunk',
            expect.objectContaining({ offsetBefore: expect.any(Number), timestamp: expect.any(Number) }),
        );
    });

    it('throws RecordingPermissionError when permission denied', async () => {
        vi.spyOn(SecureRecorder, 'hasPermission').mockResolvedValue(false);
        vi.spyOn(SecureRecorder, 'requestPermission').mockResolvedValue(false);

        const fakeRecorder = {
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: vi.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        await expect(recorder.capture(0)).rejects.toBeInstanceOf(RecordingPermissionError);
    });

    it('throws RecordingTooShortError when the recovered PCM is shorter than expected', async () => {
        // produce a single sample but request enough duration to require more
        const int16 = new Int16Array([0]);
        fakeChunks.push(new Uint8Array(int16.buffer));

        const fakeRecorder = {
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: vi.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        // 1000ms -> expect 16000 samples, only one available
        await expect(recorder.capture(1000)).rejects.toBeInstanceOf(RecordingTooShortError);

        // error log should include sessionId, duration and timestamps
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Voice calibration capture failed.',
            expect.objectContaining({
                sessionId: expect.any(String),
                durationMs: 1000,
                startTs: expect.any(Number),
                stopTs: expect.any(Number),
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
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: vi.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        const pcm = await recorder.capture(100); // 100ms -> 1600 samples expected
        expect(pcm).toBeInstanceOf(Float32Array);
        expect(pcm.length).toBe(1450); // trimmed to actual samples
        // verify normalization applied to first two samples
        expect(pcm[0]).toBeCloseTo(100 / 32768);
        expect(pcm[1]).toBeCloseTo(-100 / 32768);
    });

    it('on simulator returns silent buffer instead of throwing', async () => {
        // make Device.isDevice false to simulate simulator environment
        vi.spyOn(Device, 'isDevice', 'get').mockReturnValue(false);

        // no PCM chunks at all
        const fakeRecorder = {
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: vi.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        const expectedSamples = (VoiceCalibrationRecorder as any).SAMPLE_RATE * 1; // 1s
        const pcm = await recorder.capture(1000);
        expect(pcm.length).toBe(expectedSamples);
        expect(Array.from(pcm).every((v) => v === 0)).toBe(true);
    });

    it('forwards errors from SecureRecorder.stream', async () => {
        const error = new Error('stream fail');
        // override the default stream mock for this test only
        (SecureRecorder as any).stream = vi.fn().mockRejectedValueOnce(error);

        const fakeRecorder = {
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: vi.fn(),
        } as unknown as SecureRecorder;
        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);

        await expect(recorder.capture(0)).rejects.toThrow(error);
    });

});
