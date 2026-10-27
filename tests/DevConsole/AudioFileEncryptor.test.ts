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

import { AudioFileEncryptor } from '@/DevConsole/AudioFileEncryptor';

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
});
