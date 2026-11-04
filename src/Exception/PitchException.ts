import { TiroScribeException } from './TiroScribeException';

export class PitchException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'PITCH_ERROR', originalError);
        this.name = 'PitchException';
    }
}
