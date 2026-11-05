import { TiroScribeException } from './TiroScribeException';

export class SpectrogramException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'SPECTROGRAM_ERROR', originalError);
        this.name = 'SpectrogramException';
    }
}
