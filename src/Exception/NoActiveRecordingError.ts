/**
 * NoActiveRecordingError - Exception when no recording is active
 */

import {TiroScribeException} from './TiroScribeException';

export class NoActiveRecordingError extends TiroScribeException {
    constructor() {
        super('No active recording', 'NO_ACTIVE_RECORDING');
        this.name = 'NoActiveRecordingError';
    }
}
