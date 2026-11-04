/**
 * TiroScribeException - Base exception class for all Tiro Scribe exceptions
 *
 * Provides a common base for all application-specific exceptions
 * with structured error information
 */

export class TiroScribeException extends Error {
    public constructor(
        message: string,
        public readonly code: string,
        public readonly originalError?: Error,
        public readonly context?: Record<string, unknown>,
    ) {
        super(message);
        this.name = 'TiroScribeException';

        // Maintains proper stack trace for where our error was thrown (Hermes-only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, TiroScribeException);
        }
    }
}
