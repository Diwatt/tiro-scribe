import { TiroScribeException } from '@/Exception';

export class DevEncryptionException extends TiroScribeException {
    public constructor(message: string, code: string, originalError?: Error) {
        super(message, code, originalError);
        this.name = 'DevEncryptionException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DevEncryptionException);
        }
    }
}
