import { MelGeometryOptions } from './MelGeometryOptions';

/**
 * MelFilterBankOptions – geometry of the mel filter bank (speaker reference,
 * Kaldi-style fbank): 16 kHz, 10 ms shift, 25 ms window, 80 bands.
 */
export class MelFilterBankOptions extends MelGeometryOptions {
    public static readonly DEFAULT_SAMPLE_RATE_HZ = 16000;
    public static readonly DEFAULT_BAND_COUNT = 80;
    public static readonly DEFAULT_FRAME_SHIFT_MS = 10;
    public static readonly DEFAULT_FRAME_LENGTH_MS = 25;

    private constructor(sampleRateHz: number, bandCount: number, frameShiftMs: number, frameLengthMs: number) {
        super(sampleRateHz, bandCount, frameShiftMs, frameLengthMs);
    }

    public static create(
        sampleRateHz: number = MelFilterBankOptions.DEFAULT_SAMPLE_RATE_HZ,
        bandCount: number = MelFilterBankOptions.DEFAULT_BAND_COUNT,
        frameShiftMs: number = MelFilterBankOptions.DEFAULT_FRAME_SHIFT_MS,
        frameLengthMs: number = MelFilterBankOptions.DEFAULT_FRAME_LENGTH_MS,
    ): MelFilterBankOptions {
        return new MelFilterBankOptions(sampleRateHz, bandCount, frameShiftMs, frameLengthMs);
    }
}
