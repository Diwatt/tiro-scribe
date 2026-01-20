import type { NativeRecorderModule } from './NativeRecorderModule';
import { ErrorNormalizer } from './ErrorNormalizer';
import { ErrorCode } from './ErrorCode';

/**
 * Handles decryption of encrypted audio files.
 * Single responsibility: Decryption operations.
 */
export class DecryptionManager {
  // Private properties
  private errorNormalizer = new ErrorNormalizer();
  private nativeModule: NativeRecorderModule;
  
  // Constructor
  public constructor(nativeModule: NativeRecorderModule) {
    this.nativeModule = nativeModule;
  }

  // Public methods
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
        ErrorCode.DECRYPTION_FAILED,
        error instanceof Error ? error.message : String(error),
        error
      );
    }
  }
}
