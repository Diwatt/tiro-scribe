import { SpectrogramException } from '@/Exception';
import { MelGeometryOptions } from './MelGeometryOptions';

/**
 * LogMelSpectrogramOptions – geometry of the normalized log-mel spectrogram
 * (ASR reference): 16 kHz, 10 ms shift, 25 ms window, 128 mel bands, 0.97
 * preemphasis.
 */
export class LogMelSpectrogramOptions extends MelGeometryOptions {
    public static readonly DEFAULT_SAMPLE_RATE_HZ = 16000;
    public static readonly DEFAULT_BAND_COUNT = 128;
    public static readonly DEFAULT_FRAME_SHIFT_MS = 10;
    public static readonly DEFAULT_FRAME_LENGTH_MS = 25;
    public static readonly DEFAULT_PREEMPH_COEFF = 0.97;

    private constructor(
        sampleRateHz: number,
        bandCount: number,
        frameShiftMs: number,
        frameLengthMs: number,
        public readonly preemphCoeff: number,
    ) {
        super(sampleRateHz, bandCount, frameShiftMs, frameLengthMs);
        if (preemphCoeff < 0 || preemphCoeff >= 1) {
            throw new SpectrogramException(`Preemphasis coefficient must be in [0, 1[, received ${preemphCoeff}`);
        }
    }

    public static create(
        sampleRateHz: number = LogMelSpectrogramOptions.DEFAULT_SAMPLE_RATE_HZ,
        bandCount: number = LogMelSpectrogramOptions.DEFAULT_BAND_COUNT,
        frameShiftMs: number = LogMelSpectrogramOptions.DEFAULT_FRAME_SHIFT_MS,
        frameLengthMs: number = LogMelSpectrogramOptions.DEFAULT_FRAME_LENGTH_MS,
        preemphCoeff: number = LogMelSpectrogramOptions.DEFAULT_PREEMPH_COEFF,
    ): LogMelSpectrogramOptions {
        return new LogMelSpectrogramOptions(sampleRateHz, bandCount, frameShiftMs, frameLengthMs, preemphCoeff);
    }
}
