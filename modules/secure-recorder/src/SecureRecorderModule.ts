import { requireNativeModule } from 'expo-modules-core';
import type { NativeSecureRecorderModule, RecordingStatus } from './Type';

export type { DecryptedChunkEvent, RecordingStatus } from './Type';

class NativeSecureRecorder implements NativeSecureRecorderModule {
    public readonly EVENT_AUDIO_CHUNK_DECRYPTED = 'onAudioChunkDecrypted';
    private _nativeModule: NativeSecureRecorderModule | null = null;

    private get nativeModule(): NativeSecureRecorderModule {
        if (!this._nativeModule) {
            try {
                this._nativeModule = requireNativeModule('SecureRecorder');
            } catch (error) {
                console.error('Failed to load SecureRecorder native module:', error);
                throw new Error(
                    'SecureRecorder is a custom native module and is not available in Expo Go. Use a dev build: npx expo run:ios (or npx expo run:android). Rebuild and fully restart the app after adding the module.',
                );
            }
        }
        return this._nativeModule!;
    }

    startRecording(sessionId: string): Promise<string> {
        return this.nativeModule.startRecording(sessionId);
    }

    stopRecording(): Promise<string> {
        return this.nativeModule.stopRecording();
    }

    getStatus(): Promise<RecordingStatus> {
        return this.nativeModule.getStatus();
    }

    hasPermission(): Promise<boolean> {
        return this.nativeModule.hasPermission();
    }

    stream(encryptedPath: string): Promise<void> {
        return this.nativeModule.stream(encryptedPath);
    }

    addListener(event: string, listener: (data: any) => any): { remove: () => void } {
        return this.nativeModule.addListener(event, listener);
    }

    removeAllListeners(event?: string): void {
        return this.nativeModule.removeAllListeners(event);
    }
}

export const SecureRecorderModule = new NativeSecureRecorder();

export default SecureRecorderModule;
