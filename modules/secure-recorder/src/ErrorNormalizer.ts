import { ErrorCode } from './ErrorCode';
import type { SecureRecorderError } from './Type';

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
            code: ErrorCode.UnknownError,
            message: error instanceof Error ? error.message : String(error),
            details: error,
        };
    }

    /**
     * Mapping from native exception class name patterns to error codes.
     * Used as fallback when native code doesn't expose code property directly.
     */
    private static readonly errorNameMappings: ReadonlyArray<{
        patterns: string[];
        code: ErrorCode;
    }> = [
        { patterns: ['RecordingInProgressException', 'RecordingInProgress'], code: ErrorCode.RecordingInProgress },
        { patterns: ['NoRecordingException', 'NoRecording'], code: ErrorCode.NoRecordingInProgress },
        { patterns: ['PermissionDeniedException', 'PermissionDenied'], code: ErrorCode.PermissionDenied },
        { patterns: ['InitializationException', 'Initialization'], code: ErrorCode.InitializationFailed },
        { patterns: ['KeyStoreException', 'KeyStore'], code: ErrorCode.KeychainError },
    ];

    /**
     * Mapping from error message patterns to error codes.
     * Used for iOS SecureRecorderError enum cases.
     */
    private static readonly errorMessageMappings: ReadonlyArray<{
        patterns: string[];
        code: ErrorCode;
    }> = [
        { patterns: ['already in progress'], code: ErrorCode.RecordingInProgress },
        { patterns: ['No recording'], code: ErrorCode.NoRecordingInProgress },
        { patterns: ['permission'], code: ErrorCode.PermissionDenied },
        { patterns: ['Initialization'], code: ErrorCode.InitializationFailed },
        { patterns: ['Keychain', 'KeyStore'], code: ErrorCode.KeychainError },
    ];

    /**
     * Extracts error code from error name/type.
     * Maps native exception class names to TypeScript error codes.
     */
    private extractCodeFromErrorName(errorName: string, message?: string): ErrorCode | null {
        // Check Android exception class name patterns
        for (const mapping of ErrorNormalizer.errorNameMappings) {
            if (mapping.patterns.some((pattern) => errorName.includes(pattern))) {
                return mapping.code;
            }
        }

        // Check iOS error enum cases (if converted to Error with name)
        if (errorName.includes('SecureRecorderError') && message) {
            const lowerMessage = message.toLowerCase();
            for (const mapping of ErrorNormalizer.errorMessageMappings) {
                if (mapping.patterns.some((pattern) => lowerMessage.includes(pattern.toLowerCase()))) {
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
