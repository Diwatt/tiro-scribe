
/**
 * ChecksumVerifier tests.
 * Verifies SHA256 checksum validation with mocked crypto and file system.
 * Uses Web Streams API (readableStream) for chunked async reading.
 */

import { ChecksumVerifier } from '@/InferenceModel/Download/ChecksumVerifier';
import { InferenceModelDownloaderException } from '@/Exception';

// ---------------------------------------------------------------------------
// Mock control – mutable shared state per test
// ---------------------------------------------------------------------------

const sharedState: {
    hashUpdateCalls: Uint8Array[];
    digestResult: string;
    readResults: Array<{ done: boolean; value?: Uint8Array }>;
    readError?: Error;
    readCallCount: number;
} = {
    hashUpdateCalls: [],
    digestResult: '',
    readResults: [],
    readError: undefined,
    readCallCount: 0,
};

function resetSharedState(): void {
    sharedState.hashUpdateCalls = [];
    sharedState.digestResult = '';
    sharedState.readResults = [];
    sharedState.readError = undefined;
    sharedState.readCallCount = 0;
}

const mockHash = {
    update: jest.fn((chunk: Uint8Array) => {
        sharedState.hashUpdateCalls.push(chunk);
        return mockHash;
    }),
    digest: jest.fn(() => sharedState.digestResult),
};

const mockReader = {
    read: jest.fn(async () => {
        sharedState.readCallCount++;
        if (sharedState.readError) {
            throw sharedState.readError;
        }
        const result = sharedState.readResults[sharedState.readCallCount - 1] ?? { done: true };
        return result;
    }),
};

const mockStream = {
    getReader: jest.fn(() => mockReader),
    [Symbol.asyncIterator]: jest.fn(function* () {
        let index = 0;
        while (true) {
            if (sharedState.readError) {
                throw sharedState.readError;
            }
            const result = sharedState.readResults[index++] ?? { done: true };
            if (result.done) {
                break;
            }
            if (result.value != null) {
                yield result.value;
            }
        }
    }),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChecksumVerifier', () => {
    let verifier: ChecksumVerifier;

    beforeEach(() => {
        jest.resetModules();
        resetSharedState();
        verifier = new ChecksumVerifier();
    });

    describe('verify', () => {
        it('should compute hash from a single chunk and return digest on match', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readResults = [{ done: false, value: CHUNK_A }, { done: true }];

            const mockFile = { uri: FILE_URI, readableStream: () => mockStream } as any;

            await verifier.verify(mockFile, VALID_HASH);

            expect(mockHash.update).toHaveBeenCalledTimes(1);
            expect(mockHash.update).toHaveBeenCalledWith(CHUNK_A);
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
        });

        it('should accumulate multiple chunks before finalizing the hash', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readResults = [
                { done: false, value: CHUNK_A },
                { done: false, value: CHUNK_B },
                { done: false, value: CHUNK_C },
                { done: true },
            ];

            const mockFile = { uri: FILE_URI, readableStream: () => mockStream } as any;

            await verifier.verify(mockFile, VALID_HASH);

            expect(mockHash.update).toHaveBeenCalledTimes(3);
            expect(mockHash.update).toHaveBeenNthCalledWith(1, CHUNK_A);
            expect(mockHash.update).toHaveBeenNthCalledWith(2, CHUNK_B);
            expect(mockHash.update).toHaveBeenNthCalledWith(3, CHUNK_C);
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
        });

        it('should throw InferenceModelDownloaderException on hash mismatch', async () => {
            sharedState.digestResult = MISMATCH_HASH;
            sharedState.readResults = [{ done: false, value: CHUNK_A }, { done: true }];

            const mockFile = { uri: FILE_URI, readableStream: () => mockStream } as any;

            await expect(verifier.verify(mockFile, VALID_HASH)).rejects.toThrow(
                InferenceModelDownloaderException,
            );
            await expect(verifier.verify(mockFile, VALID_HASH)).rejects.toThrow(/Hash mismatch/);
        });

        it('should throw InferenceModelDownloaderException when stream read fails', async () => {
            sharedState.readError = new Error('readable stream closed unexpectedly');
            sharedState.readResults = [];

            const mockFile = { uri: FILE_URI, readableStream: () => mockStream } as any;

            await expect(verifier.verify(mockFile, VALID_HASH)).rejects.toThrow(
                InferenceModelDownloaderException,
            );
            await expect(verifier.verify(mockFile, VALID_HASH)).rejects.toThrow(/Failed to read file/);
        });

        it('should handle empty file (no value chunks before done)', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readResults = [{ done: true }];

            const mockFile = { uri: FILE_URI, readableStream: () => mockStream } as any;

            await expect(verifier.verify(mockFile, VALID_HASH)).resolves.toBeUndefined();
            expect(mockHash.update).not.toHaveBeenCalled();
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
        });

        it('should skip null value and continue reading', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readResults = [
                { done: false, value: CHUNK_A },
                { done: false, value: null as unknown as Uint8Array },
                { done: false, value: CHUNK_B },
                { done: true },
            ];

            const mockFile = { uri: FILE_URI, readableStream: () => mockStream } as any;

            await verifier.verify(mockFile, VALID_HASH);

            // update should only be called for non-null values
            expect(mockHash.update).toHaveBeenCalledTimes(2);
            expect(mockHash.update).toHaveBeenNthCalledWith(1, CHUNK_A);
            expect(mockHash.update).toHaveBeenNthCalledWith(2, CHUNK_B);
        });

        it('should use lowercase hash for comparison regardless of input casing', async () => {
            sharedState.digestResult = VALID_HASH;
            sharedState.readResults = [{ done: false, value: CHUNK_A }, { done: true }];

            const mockFile = { uri: FILE_URI, readableStream: () => mockStream } as any;

            const mixedCaseHash = 'A3F5C2D1E9B4A6C8F0E1D3B5A7C9E0F2A4B6C8D0E1F3A5B7C9D0E1F2A3B4C';
            await expect(verifier.verify(mockFile, mixedCaseHash)).resolves.toBeUndefined();
        });
    });
});