/**
 * MelProjector – Projects one FFT frame onto the mel filter bank.
 * Single responsibility: power spectrum, mel energies and log with zero guard.
 */
export class MelProjector {
    private readonly melFilters: Float64Array;
    private readonly magnitudeBuffer: Float64Array;

    public constructor(
        melFilters: readonly (readonly number[])[],
        numMels: number,
        private readonly numFrequencyBins: number,
        private readonly logGuard: number,
    ) {
        this.melFilters = this.flattenFilters(melFilters, numMels, numFrequencyBins);
        this.magnitudeBuffer = new Float64Array(numFrequencyBins);
    }

    public projectLogMel(real: Float64Array, imaginary: Float64Array, output: Float64Array, outputStart: number): void {
        for (let bin = 0; bin < this.numFrequencyBins; bin += 1) {
            const realValue = real[bin];
            const imaginaryValue = imaginary[bin];
            this.magnitudeBuffer[bin] = realValue * realValue + imaginaryValue * imaginaryValue;
        }
        for (let mel = 0; mel < this.melFilters.length / this.numFrequencyBins; mel += 1) {
            let energy = 0;
            const filterStart = mel * this.numFrequencyBins;
            for (let bin = 0; bin < this.numFrequencyBins; bin += 1) {
                energy += this.melFilters[filterStart + bin] * this.magnitudeBuffer[bin];
            }
            output[outputStart + mel] = Math.log(energy + this.logGuard);
        }
    }

    private flattenFilters(
        filters: readonly (readonly number[])[],
        numMels: number,
        numFrequencyBins: number,
    ): Float64Array {
        const flat = new Float64Array(numMels * numFrequencyBins);
        for (let mel = 0; mel < numMels; mel += 1) {
            for (let bin = 0; bin < numFrequencyBins; bin += 1) {
                flat[mel * numFrequencyBins + bin] = filters[mel][bin];
            }
        }

        return flat;
    }
}
