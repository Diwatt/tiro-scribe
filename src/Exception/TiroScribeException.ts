/**
 * TiroScribeException - Base exception class for all Tiro Scribe exceptions
 *
 * Provides a common base for all application-specific exceptions
 * with structured error information
 */

export class TiroScribeException extends Error {
    public readonly code: string;
    public readonly originalError?: Error;
    public readonly context?: Record<string, unknown>;

    constructor(message: string, code: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message);
        this.name = 'TiroScribeException';
        this.code = code;
        this.originalError = originalError;
        this.context = context;

        // Maintains proper stack trace for where our error was thrown (Hermes-only)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, TiroScribeException);
        }
    }
}
