/**
 * SpeakerVectorExtractionError
 * Thrown when speaker vector extraction fails
 */

import {TiroScribeException} from './TiroScribeException';

export class SpeakerVectorExtractionError extends TiroScribeException {
    constructor(message: string, originalError?: Error) {
        super(
            message,
            'SPEAKER_VECTOR_EXTRACTION_ERROR',
            originalError,
        );
        this.name = 'SpeakerVectorExtractionError';
    }
}
