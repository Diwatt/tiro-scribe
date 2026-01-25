/**
 * ModelDownloadError
 * Thrown when model download fails
 */

import {TiroScribeException} from './TiroScribeException';

export class ModelDownloadError extends TiroScribeException {
    constructor(message: string, originalError?: Error) {
        super(
            message,
            'MODEL_DOWNLOAD_ERROR',
            originalError,
        );
        this.name = 'ModelDownloadError';
    }
}
