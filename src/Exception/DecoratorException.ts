/**
 * DecoratorException - Exception for decorator/metadata layer errors.
 *
 * Extends TiroScribeException so decorator validation failures (e.g. duplicate
 * @PrimaryKey) are distinct from database or other application errors.
 */

import { TiroScribeException } from './TiroScribeException';

/** Error code when a unique decorator is applied to more than one property. */
export const MULTIPLE_DECORATORS_NOT_SUPPORTED = 'MULTIPLE_DECORATORS_NOT_SUPPORTED';

export class DecoratorException extends TiroScribeException {
    public constructor(message: string, code: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message, code, originalError, context);
        this.name = 'DecoratorException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DecoratorException);
        }
    }
}
