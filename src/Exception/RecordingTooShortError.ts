import { TiroScribeException } from './TiroScribeException';

/**
 * Thrown when a voice calibration session finishes with significantly fewer
 * samples than requested.  The device/OS likely interrupted the recording and
 * the resulting speaker vector will be unreliable or invalid.
 */
export class RecordingTooShortError extends TiroScribeException {
    public static readonly tooShort = 'RECORDING_TOO_SHORT' as const;

    public constructor(requestedSamples: number, actualSamples: number) {
        super(
            `Recording too short: requested ${requestedSamples} samples but got ${actualSamples}`,
            RecordingTooShortError.tooShort,
        );
        this.name = 'RecordingTooShortError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RecordingTooShortError);
        }
    }
}
