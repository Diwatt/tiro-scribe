jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

jest.mock('secure-recorder', () => ({
    SecureRecorder: {
        encryptBytes: jest.fn(),
        encryptFile: jest.fn(),
    },
}));

jest.mock('expo-file-system/legacy', () => ({
    documentDirectory: '/documents/',
    getInfoAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
}));

jest.mock('react-native-quick-crypto', () => ({
    Buffer: {
        from: jest.fn(() => new Uint8Array()),
    },
}));

jest.mock('expo-crypto', () => ({
    randomUUID: jest.fn(() => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
}));

jest.mock('@/DevConsole/AudioSegmentExtractor', () => ({
    AudioSegmentExtractor: {
        SAMPLES_PER_MS: 16,
        BYTES_PER_SAMPLE: 2,
        float32ToInt16: jest.fn(),
    },
}));

import { AudioFileEncryptor } from '@/DevConsole/AudioFileEncryptor';
import { SourceIngestException } from '@/DevConsole/SourceIngestException';
import { AudioSegmentExtractor } from '@/DevConsole/AudioSegmentExtractor';
import type { FileInfo } from 'expo-file-system/legacy';
import { getInfoAsync } from 'expo-file-system/legacy';
import { SecureRecorder } from 'secure-recorder';

const mockGetInfoAsync = jest.mocked(getInfoAsync);
const mockFloat32ToInt16 = jest.mocked(AudioSegmentExtractor.float32ToInt16);
const mockEncryptBytes = jest.mocked(SecureRecorder.encryptBytes);
const mockEncryptFile = jest.mocked(SecureRecorder.encryptFile);

const existingFile = (size: number, uri: string = 'file:///mock'): FileInfo => ({
    uri,
    exists: true,
    isDirectory: false,
    size,
    modificationTime: 0,
});

const missingFile = (): FileInfo => ({
    uri: 'file:///mock',
    exists: false,
    isDirectory: false,
});

const createEncryptor = (readFullPcm: jest.Mock = jest.fn()): AudioFileEncryptor =>
    new AudioFileEncryptor({ debug: jest.fn() } as never, { readFullPcm } as never);

describe('AudioFileEncryptor duration computation', () => {
    describe('durationFromSamples', () => {
        it('converts 16 000 samples (one second at 16 kHz) to 1 000 ms', () => {
            expect(AudioFileEncryptor.durationFromSamples(16_000)).toBe(1_000);
        });

        it('converts a zero-length input to 0 ms', () => {
            expect(AudioFileEncryptor.durationFromSamples(0)).toBe(0);
        });
    });

    describe('durationFromMono16kPcmBytes', () => {
        it('converts 32 000 bytes (one second of s16le mono 16 kHz) to 1 000 ms', () => {
            expect(AudioFileEncryptor.durationFromMono16kPcmBytes(32_000)).toBe(1_000);
        });

        it('converts a zero-length input to 0 ms', () => {
            expect(AudioFileEncryptor.durationFromMono16kPcmBytes(0)).toBe(0);
        });

        it('converts a partial second proportionally', () => {
            expect(AudioFileEncryptor.durationFromMono16kPcmBytes(16_000)).toBe(500);
        });
    });

    describe('toNativePath', () => {
        it('strips the file:// prefix for native SecureRecorder calls', () => {
            expect(AudioFileEncryptor.toNativePath('file:///data/user/0/files/scene.wav')).toBe(
                '/data/user/0/files/scene.wav',
            );
        });
    });

    describe('encrypt', () => {
        const WAV_PATH = '/data/user/0/files/scene_01.wav';
        const PCM_PATH = '/data/user/0/files/scene_01.pcm';
        const EXPECTED_OUTPUT = '/documents/fixture_a1b2c3d4.dat';

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('encrypts a WAV through the segment extractor and reports the size read via file:// URI', async () => {
            const readFullPcm = jest.fn().mockResolvedValue(new Float32Array(16_000));
            mockFloat32ToInt16.mockReturnValueOnce(new Int16Array(16_000));
            mockGetInfoAsync.mockImplementation(async (path: string): Promise<FileInfo> =>
                path.startsWith('file:///documents/fixture_')
                    ? existingFile(96_192, path)
                    : existingFile(96_078, path),
            );
            const encryptor = createEncryptor(readFullPcm);

            const result = await encryptor.encrypt(WAV_PATH);

            expect(readFullPcm).toHaveBeenCalledWith(WAV_PATH);
            expect(mockFloat32ToInt16).toHaveBeenCalledTimes(1);
            expect(mockEncryptBytes).toHaveBeenCalledTimes(1);
            expect(mockEncryptBytes).toHaveBeenCalledWith(expect.any(Uint8Array), EXPECTED_OUTPUT);
            expect(mockEncryptFile).not.toHaveBeenCalled();
            expect(mockGetInfoAsync).toHaveBeenCalledWith(`file://${EXPECTED_OUTPUT}`);
            expect(result.durationMs).toBe(1_000);
            expect(result.outputFile.path).toBe(EXPECTED_OUTPUT);
            expect(result.outputFile.sizeBytes).toBe(96_192);
        });

        it('encrypts raw PCM directly with a bare native path', async () => {
            mockGetInfoAsync.mockResolvedValue(existingFile(32_000));
            const encryptor = createEncryptor();

            const result = await encryptor.encrypt(PCM_PATH);

            expect(mockEncryptFile).toHaveBeenCalledWith(PCM_PATH, EXPECTED_OUTPUT);
            expect(mockEncryptBytes).not.toHaveBeenCalled();
            expect(result.durationMs).toBe(1_000);
        });

        it('rejects with INPUT_FILE_MISSING when the input does not exist', async () => {
            mockGetInfoAsync.mockResolvedValue(missingFile());
            const encryptor = createEncryptor();

            await expect(encryptor.encrypt(WAV_PATH)).rejects.toThrow(SourceIngestException);
            await expect(encryptor.encrypt(WAV_PATH)).rejects.toThrow('Input file not found');

            expect(mockEncryptBytes).not.toHaveBeenCalled();
            expect(mockEncryptFile).not.toHaveBeenCalled();
        });

        it('wraps a native encryption failure in ENCRYPTION_FAILED', async () => {
            mockGetInfoAsync.mockResolvedValue(existingFile(32_000));
            mockEncryptFile.mockRejectedValueOnce(new Error('No such file or directory'));
            const encryptor = createEncryptor();

            await expect(encryptor.encrypt(PCM_PATH)).rejects.toThrow('Encryption failed: No such file or directory');
        });
    });
});
