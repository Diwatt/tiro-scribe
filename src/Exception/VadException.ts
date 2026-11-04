import { TiroScribeException } from './TiroScribeException';

export class VadException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'VAD_ERROR', originalError);
        this.name = 'VadException';
    }
}
