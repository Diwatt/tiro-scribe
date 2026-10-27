import { TiroScribeException } from '@/Exception';

export class FixtureException extends TiroScribeException {
    public constructor(message: string, code: string, originalError?: Error) {
        super(message, code, originalError);
        this.name = 'FixtureException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FixtureException);
        }
    }
}
