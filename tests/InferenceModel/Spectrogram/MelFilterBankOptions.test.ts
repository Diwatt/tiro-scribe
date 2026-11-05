import { SpectrogramException } from '@/Exception';
import { MelFilterBankOptions } from '@/InferenceModel/Spectrogram';

describe('MelFilterBankOptions', () => {
    it('applies the default geometry constants when created without arguments', () => {
        const options = MelFilterBankOptions.create();

        expect(options.sampleRateHz).toBe(MelFilterBankOptions.DEFAULT_SAMPLE_RATE_HZ);
        expect(options.bandCount).toBe(MelFilterBankOptions.DEFAULT_BAND_COUNT);
        expect(options.frameShiftMs).toBe(MelFilterBankOptions.DEFAULT_FRAME_SHIFT_MS);
        expect(options.frameLengthMs).toBe(MelFilterBankOptions.DEFAULT_FRAME_LENGTH_MS);
    });

    it('rejects a non-positive sample rate', () => {
        expect(() => MelFilterBankOptions.create(0)).toThrow(SpectrogramException);
        expect(() => MelFilterBankOptions.create(-16000)).toThrow(SpectrogramException);
    });

    it('rejects a non-positive band count', () => {
        expect(() => MelFilterBankOptions.create(16000, 0)).toThrow(SpectrogramException);
        expect(() => MelFilterBankOptions.create(16000, -80)).toThrow(SpectrogramException);
    });

    it('rejects a non-positive frame shift', () => {
        expect(() => MelFilterBankOptions.create(16000, 80, 0)).toThrow(SpectrogramException);
        expect(() => MelFilterBankOptions.create(16000, 80, -10)).toThrow(SpectrogramException);
    });

    it('rejects a non-positive frame length', () => {
        expect(() => MelFilterBankOptions.create(16000, 80, 10, 0)).toThrow(SpectrogramException);
        expect(() => MelFilterBankOptions.create(16000, 80, 10, -25)).toThrow(SpectrogramException);
    });
});
