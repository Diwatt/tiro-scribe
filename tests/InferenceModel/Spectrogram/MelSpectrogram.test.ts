import { SpectrogramException } from '@/Exception';
import { MelSpectrogram } from '@/InferenceModel/Spectrogram';

describe('MelSpectrogram', () => {
    it('creates a spectrogram with one frame per bandCount group', () => {
        const values = Float32Array.from([1, 2, 3, 4, 5, 6]);

        const spectrogram = MelSpectrogram.create(values, 3);

        expect(spectrogram.frameCount).toBe(2);
        expect(spectrogram.bandCount).toBe(3);
        expect(spectrogram.values).toBe(values);
    });

    it('rejects a non-positive band count', () => {
        expect(() => MelSpectrogram.create(Float32Array.from([1, 2]), 0)).toThrow(SpectrogramException);
        expect(() => MelSpectrogram.create(Float32Array.from([1, 2]), -4)).toThrow(SpectrogramException);
    });

    it('rejects an empty value set', () => {
        expect(() => MelSpectrogram.create(new Float32Array(0), 1)).toThrow(SpectrogramException);
    });

    it('rejects a value length that is not a multiple of the band count', () => {
        expect(() => MelSpectrogram.create(Float32Array.from([1, 2, 3, 4, 5]), 2)).toThrow(SpectrogramException);
    });

    it('decodes a native ArrayBuffer payload as little-endian float32 values', () => {
        const buffer = new ArrayBuffer(16);
        new Float32Array(buffer).set([0.5, -0.25, 4, 2]);

        const spectrogram = MelSpectrogram.fromNative(buffer, 2);

        expect(Array.from(spectrogram.values)).toEqual([0.5, -0.25, 4, 2]);
        expect(spectrogram.frameCount).toBe(2);
        expect(spectrogram.bandCount).toBe(2);
    });

    it('rejects a native payload byte length that is not a multiple of four', () => {
        const buffer = new ArrayBuffer(6);

        expect(() => MelSpectrogram.fromNative(buffer, 1)).toThrow(SpectrogramException);
    });

    it('rejects an empty native payload', () => {
        expect(() => MelSpectrogram.fromNative(new ArrayBuffer(0), 1)).toThrow(SpectrogramException);
    });
});
