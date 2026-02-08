/**
 * TranscriptionNotImplementedError
 * Thrown when transcription functionality is not yet implemented
 */

import { TiroScribeException } from './TiroScribeException';

export class TranscriptionNotImplementedError extends TiroScribeException {
    constructor(message?: string) {
        super(message ?? 'Transcription not yet implemented. Please implement transcribeWithONNX() method.', 'TRANSCRIPTION_NOT_IMPLEMENTED');
        this.name = 'TranscriptionNotImplementedError';
    }
}
