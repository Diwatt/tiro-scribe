/**
 * DatabaseException - Base exception class for database-layer errors.
 *
 * Extends TiroScribeException to keep all error handling consistent while
 * allowing callers to distinguish database-specific failures.
 */
import { TiroScribeException } from './TiroScribeException';

export class DatabaseException extends TiroScribeException {
    public constructor(message: string, code: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message, code, originalError, context);
        this.name = 'DatabaseException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DatabaseException);
        }
    }
}

/**
 * NoActiveTherapistException - Thrown when no active therapist is found in the database.
 *
 * This is typically thrown when attempting to start an encounter recording
 * but no therapist has been set up in the system.
 */
export class NoActiveTherapistException extends DatabaseException {
    public constructor() {
        super(
            'No active therapist found. Please set up a therapist profile before recording encounters.',
            'NO_ACTIVE_THERAPIST',
        );
        this.name = 'NoActiveTherapistException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NoActiveTherapistException);
        }
    }
}
