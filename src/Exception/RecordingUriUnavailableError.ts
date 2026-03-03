/**
 * RecordingUriUnavailableError - Exception when recording URI is not available
 */

import { TiroScribeException } from './TiroScribeException';

export class RecordingUriUnavailableError extends TiroScribeException {
    public constructor(originalError?: Error) {
        super('Recording URI not available', 'RECORDING_URI_UNAVAILABLE', originalError);
        this.name = 'RecordingUriUnavailableError';
    }
}
