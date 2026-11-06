import { ErrorCode } from './ErrorCode';
import { ErrorNormalizer } from './ErrorNormalizer';
import type { NativeRecorderModule, SecureRecorderError } from './Type';
import type { DecryptedChunk } from './Type/DecryptedChunk';

/**
 * DecryptedStreamReader - object handle on a native pull reader opened on an
 * encrypted audio file. readNext() returns the next decrypted block in stream
 * order (empty + isLast once exhausted); close() releases the native reader
 * early when the consumer abandons mid-stream. The reader id never leaves
 * this class.
 */
export class DecryptedStreamReader {
    private static readonly errorNormalizer = new ErrorNormalizer();

    private constructor(
        private readonly nativeModule: NativeRecorderModule,
        private readonly readerId: string,
    ) {}

    public static async open(
        nativeModule: NativeRecorderModule,
        encryptedPath: string,
    ): Promise<DecryptedStreamReader> {
        try {
            const readerId = await nativeModule.openDecryptedStream(encryptedPath);

            return new DecryptedStreamReader(nativeModule, readerId);
        } catch (error) {
            throw DecryptedStreamReader.normalize(error);
        }
    }

    public async readNext(): Promise<DecryptedChunk> {
        try {
            return await this.nativeModule.readNextChunk(this.readerId);
        } catch (error) {
            throw DecryptedStreamReader.normalize(error);
        }
    }

    public async *[Symbol.asyncIterator](): AsyncIterableIterator<DecryptedChunk> {
        let chunk = await this.readNext();
        while (chunk.data.length > 0) {
            yield chunk;

            if (chunk.isLast) {
                return;
            }

            chunk = await this.readNext();
        }
    }

    public async close(): Promise<void> {
        try {
            return await this.nativeModule.closeDecryptedStream(this.readerId);
        } catch (error) {
            throw DecryptedStreamReader.normalize(error);
        }
    }

    private static normalize(error: unknown): SecureRecorderError {
        return DecryptedStreamReader.errorNormalizer.createError(
            ErrorCode.DecryptionFailed,
            error instanceof Error ? error.message : String(error),
            error,
        );
    }
}
