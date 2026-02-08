/**
 * HardwareGuardException - Exception for hardware guard configuration/validation errors.
 *
 * Extends TiroScribeException so invalid min-version config (e.g. unparseable semver)
 * is distinct from generic errors.
 */

import { TiroScribeException } from './TiroScribeException';

export class HardwareGuardException extends TiroScribeException {
    /** Error code when a minimum OS version string is not parseable as semver. */
    static readonly INVALID_MIN_VERSION = 'INVALID_MIN_VERSION' as const;

    public constructor(message: string, code: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message, code, originalError, context);
        this.name = 'HardwareGuardException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HardwareGuardException);
        }
    }
}
