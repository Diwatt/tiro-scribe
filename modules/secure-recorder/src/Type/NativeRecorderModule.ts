import type { RecordingStatus } from './RecordingStatus';
import type { DecryptedChunk } from './DecryptedChunk';

/**
 * Interface for native recorder module operations.
 * Enables dependency inversion and testability.
 */
export interface NativeRecorderModule {
    start(sessionId: string): Promise<string>;
    pause(): Promise<string>;
    resume(): Promise<string>;
    stop(): Promise<string>;
    getStatus(): Promise<RecordingStatus>;
    hasPermission(): Promise<boolean>;
    openDecryptedStream(encryptedPath: string): Promise<string>;
    readNextChunk(readerId: string): Promise<DecryptedChunk>;
    closeDecryptedStream(readerId: string): Promise<void>;
    addListener<TEventPayload = unknown>(
        event: string,
        listener: (data: TEventPayload) => void,
    ): Promise<{ remove: () => void }>;
}
