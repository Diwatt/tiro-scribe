import { SpectrogramException } from '@/Exception';
import { LogMelSpectrogramOptions } from '@/InferenceModel/Spectrogram';

describe('LogMelSpectrogramOptions', () => {
    it('applies the default geometry constants when created without arguments', () => {
        const options = LogMelSpectrogramOptions.create();

        expect(options.sampleRateHz).toBe(LogMelSpectrogramOptions.DEFAULT_SAMPLE_RATE_HZ);
        expect(options.bandCount).toBe(LogMelSpectrogramOptions.DEFAULT_BAND_COUNT);
        expect(options.frameShiftMs).toBe(LogMelSpectrogramOptions.DEFAULT_FRAME_SHIFT_MS);
        expect(options.frameLengthMs).toBe(LogMelSpectrogramOptions.DEFAULT_FRAME_LENGTH_MS);
        expect(options.preemphCoeff).toBe(LogMelSpectrogramOptions.DEFAULT_PREEMPH_COEFF);
    });

    it('rejects a non-positive sample rate', () => {
        expect(() => LogMelSpectrogramOptions.create(0)).toThrow(SpectrogramException);
        expect(() => LogMelSpectrogramOptions.create(-16000)).toThrow(SpectrogramException);
    });

    it('rejects a non-positive band count', () => {
        expect(() => LogMelSpectrogramOptions.create(16000, 0)).toThrow(SpectrogramException);
        expect(() => LogMelSpectrogramOptions.create(16000, -8)).toThrow(SpectrogramException);
    });

    it('rejects a non-positive frame shift', () => {
        expect(() => LogMelSpectrogramOptions.create(16000, 128, 0)).toThrow(SpectrogramException);
        expect(() => LogMelSpectrogramOptions.create(16000, 128, -10)).toThrow(SpectrogramException);
    });

    it('rejects a non-positive frame length', () => {
        expect(() => LogMelSpectrogramOptions.create(16000, 128, 10, 0)).toThrow(SpectrogramException);
        expect(() => LogMelSpectrogramOptions.create(16000, 128, 10, -25)).toThrow(SpectrogramException);
    });

    it('rejects a negative preemphasis coefficient', () => {
        expect(() => LogMelSpectrogramOptions.create(16000, 128, 10, 25, -0.1)).toThrow(SpectrogramException);
    });

    it('rejects a preemphasis coefficient at or above one', () => {
        expect(() => LogMelSpectrogramOptions.create(16000, 128, 10, 25, 1)).toThrow(SpectrogramException);
        expect(() => LogMelSpectrogramOptions.create(16000, 128, 10, 25, 1.5)).toThrow(SpectrogramException);
    });
});
