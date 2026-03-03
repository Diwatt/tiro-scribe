/**
 * SpeakerVectorExtractionError
 * Thrown when speaker vector extraction fails
 */

import { TiroScribeException } from '../../Exception/TiroScribeException';

export class SpeakerVectorExtractionError extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'SPEAKER_VECTOR_EXTRACTION_ERROR', originalError);
        this.name = 'SpeakerVectorExtractionError';
    }
}
