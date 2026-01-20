import type { SecureRecorderError } from './SecureRecorder';
import { ErrorCode } from './ErrorCode';

/**
 * Normalizes unknown errors into SecureRecorderError format.
 * Single responsibility: Error normalization logic.
 * 
 * Handles:
 * - Native exceptions with code property (Android/iOS)
 * - JavaScript Error objects
 * - Plain objects with code/message
 * - Unknown errors (fallback to UNKNOWN_ERROR)
 */
export class ErrorNormalizer {
  public normalize(error: unknown): SecureRecorderError {
    // Already in correct format (from native with code property, or TypeScript-created)
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return error as SecureRecorderError;
    }

    // Try to extract code from error name/type (for native exceptions that Expo converts)
    if (error instanceof Error) {
      const errorName = error.name || error.constructor?.name || '';
      const code = this.extractCodeFromErrorName(errorName, error.message);
      if (code) {
        return {
          code,
          message: error.message || String(error),
          details: error,
        };
      }
    }

    // Fallback to UNKNOWN_ERROR
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : String(error),
      details: error,
    };
  }

  /**
   * Mapping from native exception class name patterns to error codes.
   * Used as fallback when native code doesn't expose code property directly.
   */
  private static readonly ERROR_NAME_MAPPINGS: ReadonlyArray<{
    patterns: string[];
    code: ErrorCode;
  }> = [
    { patterns: ['RecordingInProgressException', 'RecordingInProgress'], code: ErrorCode.RECORDING_IN_PROGRESS },
    { patterns: ['NoRecordingException', 'NoRecording'], code: ErrorCode.NO_RECORDING_IN_PROGRESS },
    { patterns: ['PermissionDeniedException', 'PermissionDenied'], code: ErrorCode.PERMISSION_DENIED },
    { patterns: ['InitializationException', 'Initialization'], code: ErrorCode.INITIALIZATION_FAILED },
    { patterns: ['KeyStoreException', 'KeyStore'], code: ErrorCode.KEYCHAIN_ERROR },
  ];

  /**
   * Mapping from error message patterns to error codes.
   * Used for iOS SecureRecorderError enum cases.
   */
  private static readonly ERROR_MESSAGE_MAPPINGS: ReadonlyArray<{
    patterns: string[];
    code: ErrorCode;
  }> = [
    { patterns: ['already in progress'], code: ErrorCode.RECORDING_IN_PROGRESS },
    { patterns: ['No recording'], code: ErrorCode.NO_RECORDING_IN_PROGRESS },
    { patterns: ['permission'], code: ErrorCode.PERMISSION_DENIED },
    { patterns: ['Initialization'], code: ErrorCode.INITIALIZATION_FAILED },
    { patterns: ['Keychain', 'KeyStore'], code: ErrorCode.KEYCHAIN_ERROR },
  ];

  /**
   * Extracts error code from error name/type.
   * Maps native exception class names to TypeScript error codes.
   */
  private extractCodeFromErrorName(errorName: string, message?: string): ErrorCode | null {
    // Check Android exception class name patterns
    for (const mapping of ErrorNormalizer.ERROR_NAME_MAPPINGS) {
      if (mapping.patterns.some(pattern => errorName.includes(pattern))) {
        return mapping.code;
      }
    }

    // Check iOS error enum cases (if converted to Error with name)
    if (errorName.includes('SecureRecorderError') && message) {
      const lowerMessage = message.toLowerCase();
      for (const mapping of ErrorNormalizer.ERROR_MESSAGE_MAPPINGS) {
        if (mapping.patterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()))) {
          return mapping.code;
        }
      }
    }

    return null;
  }

  public createError(code: ErrorCode, message: string, details?: unknown): SecureRecorderError {
    return {
      code,
      message,
      details,
    };
  }
}
