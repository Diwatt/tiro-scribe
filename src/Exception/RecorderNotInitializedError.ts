/**
 * RecorderNotInitializedError - Exception when recorder is not initialized
 */

import { TiroScribeException } from './TiroScribeException';

export class RecorderNotInitializedError extends TiroScribeException {
    constructor() {
        super('Recorder not initialized', 'RECORDER_NOT_INITIALIZED');
        this.name = 'RecorderNotInitializedError';
    }
}
