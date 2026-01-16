/**
 * Recording error structure
 * Structured error information for recording operations
 */

import {RecordingErrorType} from './RecordingErrorType';

export interface RecordingError {
    type: RecordingErrorType;
    message: string;
    originalError?: Error;
}
