import type { NativeSecureRecorderModule, RecordingStatus } from './Type';

export type { DecryptedChunkEvent, RecordingStatus } from './Type';

class NativeSecureRecorder implements NativeSecureRecorderModule {
    public readonly eventAudioChunkDecrypted = 'onAudioChunkDecrypted';
    private _nativeModule: NativeSecureRecorderModule | null = null;

    // Lazily loads the native module via await import() to prevent PlatformConstants
    // TurboModule crash during module evaluation. Cached after first call.
    private async getNativeModule(): Promise<NativeSecureRecorderModule> {
        if (this._nativeModule == null) {
            try {
                const { requireNativeModule } = await import('expo-modules-core');
                this._nativeModule = requireNativeModule('SecureRecorder');
            } catch (err) {
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

    public async start(sessionId: string): Promise<string> {
        return this.getNativeModule().then((nativeModule) => nativeModule.start(sessionId));
    }

    public async pause(): Promise<string> {
        return this.getNativeModule().then((nativeModule) => nativeModule.pause());
    }

    public async resume(): Promise<string> {
        return this.getNativeModule().then((nativeModule) => nativeModule.resume());
    }

    public async stop(): Promise<string> {
        return this.getNativeModule().then((nativeModule) => nativeModule.stop());
    }

    public async getStatus(): Promise<RecordingStatus> {
        return this.getNativeModule().then((nativeModule) => nativeModule.getStatus());
    }

    public async hasPermission(): Promise<boolean> {
        return this.getNativeModule().then((nativeModule) => nativeModule.hasPermission());
    }

    public async stream(encryptedPath: string): Promise<void> {
        return this.getNativeModule().then((nativeModule) => nativeModule.stream(encryptedPath));
    }

    public async addListener<TEventPayload = unknown>(
        event: string,
        listener: (data: TEventPayload) => void,
    ): Promise<{ remove: () => void }> {
        return this.getNativeModule().then((nativeModule) => nativeModule.addListener(event, listener));
    }

    public async removeAllListeners(event?: string): Promise<void> {
        return this.getNativeModule().then((nativeModule) => nativeModule.removeAllListeners(event));
    }
}

export const SecureRecorderModule = new NativeSecureRecorder();

export default SecureRecorderModule;
