/**
 * RecordingPermissionError - Exception for permission-related errors
 */

import { TiroScribeException } from './TiroScribeException';

export class RecordingPermissionError extends TiroScribeException {
    public constructor(message = 'Audio recording permission denied', originalError?: Error) {
        super(message, 'RECORDING_PERMISSION_DENIED', originalError);
        this.name = 'RecordingPermissionError';
    }
}
