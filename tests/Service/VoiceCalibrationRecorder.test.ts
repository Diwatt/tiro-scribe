import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { VoiceCalibrationRecorder } from '@/Service/VoiceCalibrationRecorder';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';

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
        // create a few 16-bit samples: [1, -1] -> bytes little‑endian
        const int16 = new Int16Array([1, -1]);
        fakeChunks.push(new Uint8Array(int16.buffer));

        const fakeRecorder = {
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn().mockResolvedValue(undefined),
            stop: vi.fn().mockResolvedValue('/tmp/foo.enc'),
            dispose: vi.fn(),
        } as unknown as SecureRecorder;

        const recorder = new VoiceCalibrationRecorder(mockLogger, (_: string) => fakeRecorder);
        const pcm = await recorder.capture(0);

        expect(pcm).toBeInstanceOf(Float32Array);
        // normalization: 1/32768 and -1/32768
        expect(pcm[0]).toBeCloseTo(1 / 32768);
        expect(pcm[1]).toBeCloseTo(-1 / 32768);
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

    it('forwards errors from SecureRecorder.stream', async () => {
        const error = new Error('stream fail');
        vi.spyOn(SecureRecorder, 'stream').mockRejectedValueOnce(error);

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
