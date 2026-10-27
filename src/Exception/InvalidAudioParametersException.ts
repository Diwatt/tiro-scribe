/**
 * InvalidAudioParametersException - Exception for invalid DSP parameter values.
 *
 * Thrown when AudioFeatureExtractor is built with configuration outside its
 * supported domain (non-positive or non-integer sample rate, frame length or
 * frame step), which would silently produce NaN features downstream.
 */

import { TiroScribeException } from './TiroScribeException';

export class InvalidAudioParametersException extends TiroScribeException {
    /** Error code for DSP parameters outside the supported domain. */
    public static readonly invalidAudioParameters = 'INVALID_AUDIO_PARAMETERS' as const;

    public constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
        super(message, InvalidAudioParametersException.invalidAudioParameters, originalError, context);
        this.name = 'InvalidAudioParametersException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InvalidAudioParametersException);
        }
    }
}
