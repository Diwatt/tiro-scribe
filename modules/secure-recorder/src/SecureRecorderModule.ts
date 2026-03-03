import { requireNativeModule } from 'expo-modules-core';
import type { NativeSecureRecorderModule, RecordingStatus } from './Type';

export type { DecryptedChunkEvent, RecordingStatus } from './Type';

class NativeSecureRecorder implements NativeSecureRecorderModule {
    public readonly eventAudioChunkDecrypted = 'onAudioChunkDecrypted';
    private _nativeModule: NativeSecureRecorderModule | null = null;

    private get nativeModule(): NativeSecureRecorderModule {
        this._nativeModule ??= requireNativeModule('SecureRecorder');

        if (!this._nativeModule) {
            throw new Error('SecureRecorder native module initialization failed unexpectedly.');
        }

        return this._nativeModule;
    }

    public startRecording(sessionId: string): Promise<string> {
        return this.nativeModule.startRecording(sessionId);
    }

    public stopRecording(): Promise<string> {
        return this.nativeModule.stopRecording();
    }

    public getStatus(): Promise<RecordingStatus> {
        return this.nativeModule.getStatus();
    }

    public hasPermission(): Promise<boolean> {
        return this.nativeModule.hasPermission();
    }

    public stream(encryptedPath: string): Promise<void> {
        return this.nativeModule.stream(encryptedPath);
    }

    public addListener<TEventPayload = unknown>(
        event: string,
        listener: (data: TEventPayload) => void,
    ): { remove: () => void } {
        return this.nativeModule.addListener(event, listener);
    }

    public removeAllListeners(event?: string): void {
        this.nativeModule.removeAllListeners(event);
    }
}

export const SecureRecorderModule = new NativeSecureRecorder();

export default SecureRecorderModule;
