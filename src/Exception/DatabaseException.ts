/**
 * DatabaseException - Base exception class for database-layer errors.
 *
 * Extends TiroScribeException to keep all error handling consistent while
 * allowing callers to distinguish database-specific failures.
 */
import { TiroScribeException } from './TiroScribeException';

export class DatabaseException extends TiroScribeException {
    public constructor(
        message: string,
        code: string,
        originalError?: Error,
        context?: Record<string, unknown>,
    ) {
        super(message, code, originalError, context);
        this.name = 'DatabaseException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DatabaseException);
        }
    }
}

