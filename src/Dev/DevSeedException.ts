import { TiroScribeException } from '@/Exception';

export class DevSeedException extends TiroScribeException {
    public constructor(message: string, code: string, originalError?: Error) {
        super(message, code, originalError);
        this.name = 'DevSeedException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DevSeedException);
        }
    }
}
