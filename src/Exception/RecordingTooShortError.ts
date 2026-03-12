import { TiroScribeException } from './TiroScribeException';

/**
 * Thrown when a voice calibration session finishes with significantly fewer
 * samples than requested.  The device/OS likely interrupted the recording and
 * the resulting speaker vector will be unreliable or invalid.
 */
export class RecordingTooShortError extends TiroScribeException {
    constructor(requestedSamples: number, actualSamples: number) {
        super(
            `Recording too short: requested ${requestedSamples} samples but got ${actualSamples}`,
        );
    }
}
