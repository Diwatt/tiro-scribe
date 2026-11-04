import { AudioResampler } from '@/DevConsole/Ingest/AudioResampler';

describe('AudioResampler', () => {
    it('keeps every sample when the rates are identical', () => {
        const pcm = Float32Array.from([0, 0.25, -0.5, 1]);

        const resampled = AudioResampler.resample(pcm, 16000, 16000);

        expect(Array.from(resampled)).toEqual([0, 0.25, -0.5, 1]);
    });

    it('picks every ratio-th sample for an integer downsampling ratio', () => {
        const pcm = Float32Array.from(Array.from({ length: 48 }, (_, i) => i / 48));
        const expectedSample5 = pcm[15];

        const resampled = AudioResampler.resample(pcm, 48000, 16000);

        expect(resampled.length).toBe(16);
        expect(resampled[5]).toBeCloseTo(expectedSample5, 10);
    });

    it('interpolates between samples for fractional ratios', () => {
        const pcm = Float32Array.from([0, 1]);

        const resampled = AudioResampler.resample(pcm, 16000, 32000);

        expect(resampled.length).toBe(4);
        expect(resampled[0]).toBe(0);
        expect(resampled[1]).toBeCloseTo(0.5, 10);
        expect(resampled[2]).toBe(1);
    });
});
