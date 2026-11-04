/**
 * AudioResampler – Linear-interpolation resampling of float32 PCM.
 * Single responsibility: changing the sample rate, nothing else.
 * Stateless by design.
 */
export class AudioResampler {
    public static resample(pcm: Float32Array, fromRate: number, toRate: number): Float32Array {
        const ratio = fromRate / toRate;
        const newLength = Math.floor(pcm.length / ratio);
        const resampled = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const sourceIndex = i * ratio;
            const index0 = Math.floor(sourceIndex);
            const index1 = Math.min(index0 + 1, pcm.length - 1);
            const fraction = sourceIndex - index0;

            resampled[i] = pcm[index0] * (1 - fraction) + pcm[index1] * fraction;
        }

        return resampled;
    }
}
