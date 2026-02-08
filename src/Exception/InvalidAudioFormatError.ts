/**
 * InvalidAudioFormatError
 * Thrown when audio format is invalid or unsupported
 */

import { TiroScribeException } from './TiroScribeException';

export class InvalidAudioFormatError extends TiroScribeException {
    constructor(message?: string, originalError?: Error) {
        super(message ?? 'Invalid audio format', 'INVALID_AUDIO_FORMAT', originalError);
        this.name = 'InvalidAudioFormatError';
    }
}
