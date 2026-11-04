import { TiroScribeException } from '@/Exception';

export class SourceIngestException extends TiroScribeException {
    public constructor(message: string, code: string, originalError?: Error) {
        super(message, code, originalError);
        this.name = 'SourceIngestException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SourceIngestException);
        }
    }
}
