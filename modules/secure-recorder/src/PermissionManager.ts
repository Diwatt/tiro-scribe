import { ErrorCode } from './ErrorCode';
import { ErrorNormalizer } from './ErrorNormalizer';
import type { NativeRecorderModule } from './Type';

/**
 * Handles microphone permission operations.
 * Single responsibility: Permission management.
 */
export class PermissionManager {
    private errorNormalizer = new ErrorNormalizer();

    public constructor(
        private nativeModule: NativeRecorderModule,
        private requestPermissionFn: () => Promise<{ granted: boolean }>,
    ) {}

    /**
     * Checks if microphone permission is granted.
     */
    public async hasPermission(): Promise<boolean> {
        if (this.nativeModule == null) {
            throw this.errorNormalizer.createError(
                ErrorCode.PermissionCheckFailed,
                'SecureRecorder native module is undefined. Use a dev build (npx expo run:ios or npx expo run:android), not Expo Go. Rebuild and restart the app.',
                new Error('nativeModule is undefined'),
            );
        }
        try {
            return await this.nativeModule.hasPermission();
        } catch (error) {
            throw this.errorNormalizer.createError(
                ErrorCode.PermissionCheckFailed,
                error instanceof Error ? error.message : String(error),
                error,
            );
        }
    }

    /**
     * Requests microphone permission from the user.
     */
    public async requestPermission(): Promise<boolean> {
        try {
            const { granted } = await this.requestPermissionFn();
            return granted;
        } catch (error) {
            throw this.errorNormalizer.createError(
                ErrorCode.PermissionRequestFailed,
                error instanceof Error ? error.message : String(error),
                error,
            );
        }
    }
}
