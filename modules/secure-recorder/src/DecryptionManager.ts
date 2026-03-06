import { ErrorCode } from './ErrorCode';
import { ErrorNormalizer } from './ErrorNormalizer';
import type { NativeRecorderModule } from './Type';

/**
 * Handles decryption of encrypted audio files.
 * Single responsibility: Decryption operations.
 */
export class DecryptionManager {
    private errorNormalizer = new ErrorNormalizer();
    private nativeModule: NativeRecorderModule;

    public constructor(nativeModule: NativeRecorderModule) {
        this.nativeModule = nativeModule;
    }

    /**
     * Stream decrypt encrypted audio file, emitting events for each chunk
     *
     * MEMORY SAFE: Uses true streaming to read chunks incrementally from disk.
     * Listen to 'onAudioChunkDecrypted' events to receive chunks.
     *
     * @returns Promise that resolves when decryption starts
     */
    public async stream(encryptedPath: string): Promise<void> {
        try {
            await this.nativeModule.stream(encryptedPath);
        } catch (error) {
            throw this.errorNormalizer.createError(
                ErrorCode.DecryptionFailed,
                error instanceof Error ? error.message : String(error),
                error,
            );
        }
    }
}
