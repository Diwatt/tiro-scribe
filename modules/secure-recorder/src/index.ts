import SecureRecorderModule from './SecureRecorderModule';

export interface SecureRecorderError {
  code: string;
  message: string;
  details?: unknown;
}

export interface RecordingStatus {
  isRecording: boolean;
  sessionId: string | null;
  filePath: string | null;
}

/**
 * Secure audio recorder with streaming AES-256-GCM encryption.
 * Audio data is encrypted in real-time before being written to disk.
 */
export class SecureRecorder {
  /**
   * Starts recording audio with streaming encryption.
   * @param sessionId - Unique identifier for this recording session. File will be named `{sessionId}.dat`
   * @returns Promise that resolves to the absolute path of the encrypted file
   * @throws {SecureRecorderError} If recording fails, permission is denied, or encryption setup fails
   */
  static async startRecording(sessionId: string): Promise<string> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw {
        code: 'INVALID_SESSION_ID',
        message: 'Session ID cannot be empty',
      } as SecureRecorderError;
    }

    try {
      const filePath = await SecureRecorderModule.startRecording(sessionId);
      return filePath;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Stops the current recording session.
   * @returns Promise that resolves to the absolute path of the encrypted file
   * @throws {SecureRecorderError} If no recording is active or stopping fails
   */
  static async stopRecording(): Promise<string> {
    try {
      const filePath = await SecureRecorderModule.stopRecording();
      return filePath;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Gets the current recording status.
   * @returns Promise that resolves to the current recording status
   */
  static async getStatus(): Promise<RecordingStatus> {
    try {
      return await SecureRecorderModule.getStatus();
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Checks if microphone permission is granted.
   * @returns Promise that resolves to true if permission is granted, false otherwise
   */
  static async hasPermission(): Promise<boolean> {
    try {
      return await SecureRecorderModule.hasPermission();
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Requests microphone permission from the user.
   * @returns Promise that resolves to true if permission is granted, false if denied
   */
  static async requestPermission(): Promise<boolean> {
    try {
      return await SecureRecorderModule.requestPermission();
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private static normalizeError(error: unknown): SecureRecorderError {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return error as SecureRecorderError;
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : String(error),
      details: error,
    };
  }
}

export default SecureRecorder;
