/**
 * InvalidKeyfileException - Exception for an unreadable database keyfile.
 *
 * Thrown when the keyfile on disk is not valid JSON, fails schema validation,
 * or carries an unsupported version: the auth-gated boot cannot proceed
 * without a usable keyfile.
 */

import { TiroScribeException } from './TiroScribeException';

export class InvalidKeyfileException extends TiroScribeException {
    /** Error code for an unreadable or unsupported database keyfile. */
    public static readonly invalidKeyfile = 'INVALID_KEYFILE' as const;

    public constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message, InvalidKeyfileException.invalidKeyfile, originalError, context);
        this.name = 'InvalidKeyfileException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InvalidKeyfileException);
        }
    }
}
