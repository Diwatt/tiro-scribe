/**
 * Tests for DecryptedStreamReader.
 *
 * O - One: open binds the reader to the native-issued reader id
 * M - Many: consecutive reads delegate with the bound id
 * B - Boundary: isLast blocks flow through untouched
 * I - Interface: close delegates with the bound id, the id never leaks
 * E - Exceptions: native failures are normalized and surfaced
 */

import { ErrorCode } from '../src/ErrorCode';
import { DecryptedStreamReader } from '../src/DecryptedStreamReader';
import type { NativeRecorderModule } from '../src/Type';
import type { DecryptedChunk } from '../src/Type/DecryptedChunk';

type FakeNativeModule = {
    openDecryptedStream: jest.Mock;
    readNextChunk: jest.Mock;
    closeDecryptedStream: jest.Mock;
};

function makeFakeNativeModule(): FakeNativeModule & NativeRecorderModule {
    return {
        openDecryptedStream: jest.fn(),
        readNextChunk: jest.fn(),
        closeDecryptedStream: jest.fn(),
    } as unknown as FakeNativeModule & NativeRecorderModule;
}

describe('DecryptedStreamReader', () => {
    let nativeModule: FakeNativeModule & NativeRecorderModule;

    beforeEach(() => {
        nativeModule = makeFakeNativeModule();
    });

    describe('O - One Cases', () => {
        it('open should bind the reader to the id issued by the native module', async () => {
            nativeModule.openDecryptedStream.mockResolvedValueOnce('reader-42');

            const reader = await DecryptedStreamReader.open(nativeModule, '/fixtures/session.dat');

            expect(nativeModule.openDecryptedStream).toHaveBeenCalledWith('/fixtures/session.dat');

            const chunk: DecryptedChunk = { data: new Uint8Array([1, 2, 3, 4]), isLast: false };
            nativeModule.readNextChunk.mockResolvedValueOnce(chunk);
            await expect(reader.readNext()).resolves.toEqual(chunk);
            expect(nativeModule.readNextChunk).toHaveBeenCalledWith('reader-42');
        });
    });

    describe('M - Many Cases', () => {
        it('should walk consecutive reads with the same bound id', async () => {
            nativeModule.openDecryptedStream.mockResolvedValueOnce('reader-42');
            const first: DecryptedChunk = { data: new Uint8Array(4), isLast: false };
            const last: DecryptedChunk = { data: new Uint8Array(2), isLast: true };
            nativeModule.readNextChunk.mockResolvedValueOnce(first).mockResolvedValueOnce(last);

            const reader = await DecryptedStreamReader.open(nativeModule, '/fixtures/session.dat');

            await expect(reader.readNext()).resolves.toEqual(first);
            await expect(reader.readNext()).resolves.toEqual(last);
            expect(nativeModule.readNextChunk).toHaveBeenCalledTimes(2);
            expect(nativeModule.readNextChunk).toHaveBeenCalledWith('reader-42');
        });
    });

    describe('B - Boundary Cases', () => {
        it('should hand the last data block through untouched', async () => {
            nativeModule.openDecryptedStream.mockResolvedValueOnce('reader-42');
            const last: DecryptedChunk = { data: new Uint8Array([9, 9, 9]), isLast: true };
            nativeModule.readNextChunk.mockResolvedValueOnce(last);

            const reader = await DecryptedStreamReader.open(nativeModule, '/fixtures/session.dat');

            await expect(reader.readNext()).resolves.toEqual(last);
        });
    });

    describe('I - Interface Cases', () => {
        it('close should delegate with the bound id', async () => {
            nativeModule.openDecryptedStream.mockResolvedValueOnce('reader-42');
            nativeModule.closeDecryptedStream.mockResolvedValueOnce(undefined);

            const reader = await DecryptedStreamReader.open(nativeModule, '/fixtures/session.dat');

            await expect(reader.close()).resolves.toBeUndefined();
            expect(nativeModule.closeDecryptedStream).toHaveBeenCalledWith('reader-42');
        });
    });

    describe('Async Iteration', () => {
        it('should yield data blocks in order and stop on the announced last without over-reading', async () => {
            nativeModule.openDecryptedStream.mockResolvedValueOnce('reader-42');
            const first: DecryptedChunk = { data: new Uint8Array(4), isLast: false };
            const last: DecryptedChunk = { data: new Uint8Array(2), isLast: true };
            nativeModule.readNextChunk.mockResolvedValueOnce(first).mockResolvedValueOnce(last);

            const reader = await DecryptedStreamReader.open(nativeModule, '/fixtures/session.dat');
            const chunks: DecryptedChunk[] = [];
            for await (const chunk of reader) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([first, last]);
            expect(nativeModule.readNextChunk).toHaveBeenCalledTimes(2);
        });

        it('should yield nothing on a stream that only carries the terminal empty block', async () => {
            nativeModule.openDecryptedStream.mockResolvedValueOnce('reader-42');
            nativeModule.readNextChunk.mockResolvedValueOnce({ data: new Uint8Array(0), isLast: true });

            const reader = await DecryptedStreamReader.open(nativeModule, '/fixtures/empty.dat');
            const chunks: DecryptedChunk[] = [];
            for await (const chunk of reader) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([]);
            expect(nativeModule.readNextChunk).toHaveBeenCalledTimes(1);
        });
    });

    describe('E - Exception Cases', () => {
        it('should surface open failures as normalized decryption errors', async () => {
            nativeModule.openDecryptedStream.mockRejectedValueOnce(new Error('Encrypted file not found'));

            await expect(DecryptedStreamReader.open(nativeModule, '/missing.dat')).rejects.toMatchObject({
                code: ErrorCode.DecryptionFailed,
                message: 'Encrypted file not found',
            });
        });

        it('should surface read failures as normalized decryption errors', async () => {
            nativeModule.openDecryptedStream.mockResolvedValueOnce('reader-42');
            nativeModule.readNextChunk.mockRejectedValueOnce(new Error('Unknown decrypted stream reader'));

            const reader = await DecryptedStreamReader.open(nativeModule, '/fixtures/session.dat');

            await expect(reader.readNext()).rejects.toMatchObject({
                code: ErrorCode.DecryptionFailed,
                message: 'Unknown decrypted stream reader',
            });
        });
    });
});
