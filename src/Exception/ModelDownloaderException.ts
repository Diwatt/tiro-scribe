/**
 * ModelDownloaderException
 * Thrown when model download fails
 */

import { TiroScribeException } from './TiroScribeException';

export class ModelDownloaderException extends TiroScribeException {
    constructor(message: string, originalError?: Error) {
        super(message, 'MODEL_DOWNLOAD_ERROR', originalError);
        this.name = 'ModelDownloaderException';
    }
}
