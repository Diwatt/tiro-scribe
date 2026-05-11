import type { RecordingStatus } from './RecordingStatus';

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
    stream(encryptedPath: string): Promise<void>;
    addListener<TEventPayload = unknown>(
        event: string,
        listener: (data: TEventPayload) => void,
    ): { remove: () => void };
}
