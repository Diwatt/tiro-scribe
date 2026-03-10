import { requireNativeModule } from 'expo-modules-core';
import type { NativeSecureRecorderModule, RecordingStatus } from './Type';

export type { DecryptedChunkEvent, RecordingStatus } from './Type';

class NativeSecureRecorder implements NativeSecureRecorderModule {
    public readonly eventAudioChunkDecrypted = 'onAudioChunkDecrypted';
    private _nativeModule: NativeSecureRecorderModule | null = null;

    private get nativeModule(): NativeSecureRecorderModule {
        // lazy-load the native implementation; expo-modules-core will throw if the
        // module isn't registered (e.g. when running in Expo Go). We catch that
        // and rephrase the message so developers know what to do instead of
        // staring at a cryptic "Cannot find native module" error.
        if (this._nativeModule == null) {
            try {
                this._nativeModule = requireNativeModule('SecureRecorder');
            } catch (err) {
                // original error message may already be descriptive, but we add
                // guidance about the build environment.
                const original = err instanceof Error ? err.message : String(err);
                throw new Error(
                    `SecureRecorder native module unavailable. ` +
                        `Make sure you are running a development build or a standalone ` +
                        `app (npx expo run:ios / run:android or an EAS build), ` +
                        `not Expo Go.\n` +
                        `Original error: ${original}`,
                );
            }

            if (!this._nativeModule) {
                throw new Error('SecureRecorder native module initialization failed unexpectedly.');
            }
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
