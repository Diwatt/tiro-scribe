import { TiroScribeException } from './TiroScribeException';

export class SpeakerIdException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'SPEAKER_ID_ERROR', originalError);
        this.name = 'SpeakerIdException';
    }
}
