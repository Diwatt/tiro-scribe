import { TiroScribeException } from './TiroScribeException';

export class UnsupportedCapabilityException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'UNSUPPORTED_CAPABILITY', originalError);
        this.name = 'UnsupportedCapabilityException';
    }
}
