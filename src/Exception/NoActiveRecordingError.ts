/**
 * NoActiveRecordingError - Exception when no recording is active
 */

import { TiroScribeException } from './TiroScribeException';

export class NoActiveRecordingError extends TiroScribeException {
    public constructor() {
        super('No active recording', 'NO_ACTIVE_RECORDING');
        this.name = 'NoActiveRecordingError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NoActiveRecordingError);
        }
    }
}

/**
 * RecordingFilePathNotAvailableError - Exception when file path is not available after starting recorder
 *
 * This should never happen if SecureRecorder.start() succeeds, as it guarantees a file path.
 * This exception exists as a defensive check for type safety (no non-null assertions).
 */
export class RecordingFilePathNotAvailableError extends TiroScribeException {
    public constructor() {
        super(
            'Recording file path not available after starting recorder. This indicates a bug in SecureRecorder.',
            'FILE_PATH_NOT_AVAILABLE',
        );
        this.name = 'RecordingFilePathNotAvailableError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RecordingFilePathNotAvailableError);
        }
    }
}
