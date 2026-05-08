import type { RecordingStatus } from './RecordingStatus';

/**
 * Shape of the native SecureRecorder Expo module API.
 * Used by the forwarding object in SecureRecorderModule and by NativeModuleProxy.
 */
export interface NativeSecureRecorderModule {
    startRecording(sessionId: string): Promise<string>;
    pauseRecording(): Promise<string>;
    resumeRecording(): Promise<string>;
    stopRecording(): Promise<string>;
    getStatus(): Promise<RecordingStatus>;
    hasPermission(): Promise<boolean>;
    stream(encryptedPath: string): Promise<void>;
    addListener<TEventPayload = unknown>(
        event: string,
        listener: (data: TEventPayload) => void,
    ): { remove: () => void };
    removeAllListeners(event?: string): void;
}
