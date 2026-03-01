import type { RecordingStatus } from './RecordingStatus';

/**
 * Interface for native recorder module operations.
 * Enables dependency inversion and testability.
 */
export interface NativeRecorderModule {
    startRecording(sessionId: string): Promise<string>;
    stopRecording(): Promise<string>;
    getStatus(): Promise<RecordingStatus>;
    hasPermission(): Promise<boolean>;
    stream(encryptedPath: string): Promise<void>;
    addListener<TEventPayload = unknown>(
        event: string,
        listener: (data: TEventPayload) => void,
    ): { remove: () => void };
}
