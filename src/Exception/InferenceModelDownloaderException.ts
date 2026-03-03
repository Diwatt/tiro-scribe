/**
 * InferenceModelDownloaderException
 * Thrown when inference model download or verification fails.
 */

import { TiroScribeException } from './TiroScribeException';

export class InferenceModelDownloaderException extends TiroScribeException {
    public constructor(message: string, originalError?: Error) {
        super(message, 'INFERENCE_MODEL_DOWNLOADER_ERROR', originalError);
        this.name = 'InferenceModelDownloaderException';
    }
}
