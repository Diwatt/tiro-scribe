import type { NativeRecorderModule } from './NativeRecorderModule';
import { ErrorNormalizer } from './ErrorNormalizer';
import { ErrorCode } from './ErrorCode';

/**
 * Handles microphone permission operations.
 * Single responsibility: Permission management.
 */
export class PermissionManager {
  private errorNormalizer = new ErrorNormalizer();

  public constructor(
    private nativeModule: NativeRecorderModule,
    private requestPermissionFn: () => Promise<{ granted: boolean }>
  ) {}

  /**
   * Checks if microphone permission is granted.
   */
  public async hasPermission(): Promise<boolean> {
    try {
      return await this.nativeModule.hasPermission();
    } catch (error) {
      throw this.errorNormalizer.createError(
        ErrorCode.PERMISSION_CHECK_FAILED,
        error instanceof Error ? error.message : String(error),
        error
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
        ErrorCode.PERMISSION_REQUEST_FAILED,
        error instanceof Error ? error.message : String(error),
        error
      );
    }
  }
}
