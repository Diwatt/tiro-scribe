/**
 * InvalidMasterKeyException - Exception for biocode master key validation failures.
 *
 * Thrown when a projection matrix is requested without a usable master key
 * (empty, null or undefined), which would silently derive a degenerate biocode.
 */

import { TiroScribeException } from './TiroScribeException';

export class InvalidMasterKeyException extends TiroScribeException {
    /** Error code for a missing or empty master key. */
    public static readonly invalidMasterKey = 'INVALID_MASTER_KEY' as const;

    public constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message, InvalidMasterKeyException.invalidMasterKey, originalError, context);
        this.name = 'InvalidMasterKeyException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InvalidMasterKeyException);
        }
    }
}
