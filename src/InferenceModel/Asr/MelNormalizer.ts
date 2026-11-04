/**
 * MelNormalizer – Per-bin mean/variance normalization of the log-mel frames.
 * Single responsibility: statistics over valid frames, zero-padding untouched.
 */
export class MelNormalizer {
    public constructor(
        private readonly numMels: number,
        private readonly epsilon: number,
    ) {}

    public normalize(logMel: Float64Array, featuresLength: number): Float32Array {
        const data = new Float32Array(logMel.length);
        for (let mel = 0; mel < this.numMels; mel += 1) {
            let sum = 0;
            for (let frame = 0; frame < featuresLength; frame += 1) {
                sum += logMel[frame * this.numMels + mel];
            }
            const mean = sum / featuresLength;
            let varianceSum = 0;
            for (let frame = 0; frame < featuresLength; frame += 1) {
                const centered = logMel[frame * this.numMels + mel] - mean;
                varianceSum += centered * centered;
            }
            const scale = Math.sqrt(varianceSum / (featuresLength - 1)) + this.epsilon;
            for (let frame = 0; frame < featuresLength; frame += 1) {
                data[frame * this.numMels + mel] = (logMel[frame * this.numMels + mel] - mean) / scale;
            }
        }

        return data;
    }
}
