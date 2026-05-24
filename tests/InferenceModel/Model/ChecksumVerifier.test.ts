/**
 * ChecksumVerifier tests.
 * Verifies SHA256 checksum validation with mocked crypto and file system.
 * Uses Expo 55 FileHandle API (readBytes / close) for chunked reading.
 */

import { ChecksumVerifier } from '@/InferenceModel/Download/ChecksumVerifier';
import { InferenceModelDownloaderException } from '@/Exception';
import type { File } from 'expo-file-system';

// ---------------------------------------------------------------------------
// Mock control – mutable shared state per test
// ---------------------------------------------------------------------------

const sharedState: {
    hashUpdateCalls: Uint8Array[];
    digestResult: string;
    readBytesResults: Uint8Array[];
    readBytesError?: Error;
    readBytesCallCount: number;
    closeCallCount: number;
} = {
    hashUpdateCalls: [],
    digestResult: '',
    readBytesResults: [],
    readBytesError: undefined,
    readBytesCallCount: 0,
    closeCallCount: 0,
};

function resetSharedState(): void {
    sharedState.hashUpdateCalls = [];
    sharedState.digestResult = '';
    sharedState.readBytesResults = [];
    sharedState.readBytesError = undefined;
    sharedState.readBytesCallCount = 0;
    sharedState.closeCallCount = 0;
}

const mockHandle = {
    readBytes: jest.fn((_size: number): Uint8Array => {
        sharedState.readBytesCallCount++;
        if (sharedState.readBytesError) {
            throw sharedState.readBytesError;
        }
        return sharedState.readBytesResults[sharedState.readBytesCallCount - 1] ?? new Uint8Array(0);
    }),
    close: jest.fn(() => {
        sharedState.closeCallCount++;
    }),
};

const mockHash: { update: jest.Mock; digest: jest.Mock } = {
    update: jest.fn((chunk: Uint8Array) => {
        sharedState.hashUpdateCalls.push(chunk);
        return mockHash;
    }),
    digest: jest.fn(() => sharedState.digestResult),
};

// ---------------------------------------------------------------------------
// Module-level mock (evaluated before any imports)
// ---------------------------------------------------------------------------

jest.mock('react-native-quick-crypto', () => ({
    createHash: jest.fn(() => mockHash),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FILE_URI = 'file://test/model.enc';
const VALID_HASH = 'a3f5c2d1e9b4a6c8f0e1d3b5a7c9e0f2a4b6c8d0e1f3a5b7c9d0e1f2a3b4c';
const MISMATCH_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const CHUNK_A = new Uint8Array([0x01, 0x02, 0x03]);
const CHUNK_B = new Uint8Array([0x04, 0x05, 0x06]);
const CHUNK_C = new Uint8Array([0x07, 0x08, 0x09]);

function createMockFile(): File {
    return {
        uri: FILE_URI,
        open: jest.fn(() => mockHandle),
    } as unknown as File;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChecksumVerifier', () => {
    let verifier: ChecksumVerifier;

    beforeEach(() => {
        jest.clearAllMocks();
        resetSharedState();
        verifier = new ChecksumVerifier();
    });

    describe('verify', () => {
        it('should compute hash from a single chunk and return digest on match', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readBytesResults = [CHUNK_A, new Uint8Array(0)];

            await verifier.verify(createMockFile(), VALID_HASH);

            expect(mockHash.update).toHaveBeenCalledTimes(1);
            expect(mockHash.update).toHaveBeenCalledWith(CHUNK_A);
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
            expect(mockHandle.close).toHaveBeenCalled();
        });

        it('should accumulate multiple chunks before finalizing the hash', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readBytesResults = [CHUNK_A, CHUNK_B, CHUNK_C, new Uint8Array(0)];

            await verifier.verify(createMockFile(), VALID_HASH);

            expect(mockHash.update).toHaveBeenCalledTimes(3);
            expect(mockHash.update).toHaveBeenNthCalledWith(1, CHUNK_A);
            expect(mockHash.update).toHaveBeenNthCalledWith(2, CHUNK_B);
            expect(mockHash.update).toHaveBeenNthCalledWith(3, CHUNK_C);
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
            expect(mockHandle.close).toHaveBeenCalled();
        });

        it('should throw InferenceModelDownloaderException on hash mismatch', async () => {
            sharedState.digestResult = MISMATCH_HASH;
            sharedState.readBytesResults = [CHUNK_A, new Uint8Array(0)];

            await expect(verifier.verify(createMockFile(), VALID_HASH)).rejects.toThrow(
                InferenceModelDownloaderException,
            );
            await expect(verifier.verify(createMockFile(), VALID_HASH)).rejects.toThrow(/Hash mismatch/);
        });

        it('should throw InferenceModelDownloaderException when readBytes fails', async () => {
            sharedState.readBytesError = new Error('disk I/O error');
            sharedState.readBytesResults = [];

            await expect(verifier.verify(createMockFile(), VALID_HASH)).rejects.toThrow(
                InferenceModelDownloaderException,
            );
            await expect(verifier.verify(createMockFile(), VALID_HASH)).rejects.toThrow(/Failed to read file/);
            // handle.close must still be called even on error (via finally)
            expect(mockHandle.close).toHaveBeenCalled();
        });

        it('should handle empty file (readBytes returns zero-length on first call)', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readBytesResults = [new Uint8Array(0)];

            await expect(verifier.verify(createMockFile(), VALID_HASH)).resolves.toBeUndefined();
            expect(mockHash.update).not.toHaveBeenCalled();
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
            expect(mockHandle.close).toHaveBeenCalled();
        });

        it('should use lowercase hash for comparison regardless of input casing', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readBytesResults = [CHUNK_A, new Uint8Array(0)];

            const mixedCaseHash = 'A3F5C2D1E9B4A6C8F0E1D3B5A7C9E0F2A4B6C8D0E1F3A5B7C9D0E1F2A3B4C';
            await expect(verifier.verify(createMockFile(), mixedCaseHash)).resolves.toBeUndefined();
        });

        it('should always close the file handle even when an error occurs mid-read', async () => {
            // First call succeeds, second call throws
            let callCount = 0;
            mockHandle.readBytes.mockImplementation((_size: number) => {
                callCount++;
                if (callCount === 1) return CHUNK_A;
                throw new Error('unexpected EOF');
            });

            await expect(verifier.verify(createMockFile(), VALID_HASH)).rejects.toThrow(
                InferenceModelDownloaderException,
            );

            expect(mockHandle.close).toHaveBeenCalledTimes(1);
        });
    });
});
