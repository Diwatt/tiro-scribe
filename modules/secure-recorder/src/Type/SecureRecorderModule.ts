import type { RecordingStatus } from './RecordingStatus';

/**
 * Shape of the native SecureRecorder Expo module API.
 * Used by the forwarding object in SecureRecorderModule and by NativeModuleProxy.
 */
export interface NativeSecureRecorderModule {
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
    removeAllListeners(event?: string): void;
}
