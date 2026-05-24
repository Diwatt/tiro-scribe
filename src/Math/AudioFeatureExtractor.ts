/**
 * AudioFeatureExtractor - Hand-rolled DSP for mel spectrogram extraction
 *
 * Computes 80-dim log mel filterbank features from raw PCM audio
 * using naive DFT-based approach for compatibility with CAM++ speaker model.
 *
 * TODO: Replace with native kaldi-native-fbank binding or sherpa-onnx
 * for guaranteed Kaldi compatibility. Current JS implementation is approximate.
 * See: https://github.com/csukuangfj/kaldi-native-fbank
 * See: https://github.com/k2-fsa/sherpa-onnx (has speaker embedding + fbank built-in)
 */

import * as math from 'mathjs';

export class AudioFeatureExtractor {
    private readonly melFilterBank: number[][];

    /**
     * Initialize AudioFeatureExtractor with DSP parameters
     */
    public constructor(
        private readonly sampleRate: number = 16000,
        private readonly frameLength: number = 400, // 25ms at 16kHz
        private readonly frameStep: number = 160, // 10ms at 16kHz
        private readonly fftLength: number = 512,
        private readonly numMelBins: number = 80,
        private readonly preEmphasisCoeff: number = 0.97,
    ) {
        this.melFilterBank = this.generateMelFilterBankMatrix();
    }

    /**
     * Extract mel spectrogram features from raw PCM audio
     * @param pcm - Raw PCM audio samples (Float32Array, 16kHz mono)
     * @returns Flattened mel spectrogram features (Float32Array)
     */
    public extract(pcm: Float32Array): Float32Array {
        // Step 1: Pre-emphasis filter
        const preEmphasized = this.applyPreEmphasisFilter(pcm);
        // Step 2: Frame the signal
        const frames = this.segmentSignalIntoFrames(preEmphasized);
        // Step 3: Apply Hamming window to each frame
        const windowedFrames = frames.map((frame: Float32Array) => this.applyHammingWindowFunction(frame));
        // Step 4: Compute power spectrum using DFT
        const powerSpectra = windowedFrames.map((frame: Float32Array) => this.computePowerSpectralDensity(frame));
        // Step 5: Apply mel filter bank
        const melSpectra = powerSpectra.map((spectrum: Float32Array) => this.applyMelFilterBankMatrix(spectrum));
        // Step 6: Log compression
        const logMelSpectra = melSpectra.map((melSpec: Float32Array) => this.applyLogarithmicCompression(melSpec));
        // Step 7: Flatten and return as Float32Array
        const flattened = new Float32Array(logMelSpectra.length * this.numMelBins);
        let offset = 0;
        for (const frame of logMelSpectra) {
            flattened.set(frame, offset);
            offset += frame.length;
        }

        return flattened;
    }

    /**
     * Apply Hamming window to reduce spectral leakage
     */
    private applyHammingWindowFunction(frame: Float32Array): Float32Array {
        const windowed = new Float32Array(frame.length);
        for (let i = 0; i < frame.length; i++) {
            const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1));
            windowed[i] = frame[i] * hamming;
        }

        return windowed;
    }

    /**
     * Log compression with numerical stability
     */
    private applyLogarithmicCompression(melSpec: Float32Array): Float32Array {
        const logMel = new Float32Array(melSpec.length);
        for (let i = 0; i < melSpec.length; i++) {
            logMel[i] = Math.log(Math.max(melSpec[i], 1e-8));
        }

        return logMel;
    }

    /**
     * Apply mel filter bank to power spectrum
     */
    private applyMelFilterBankMatrix(spectrum: Float32Array): Float32Array {
        const melSpec = new Float32Array(this.numMelBins);
        for (let m = 0; m < this.numMelBins; m++) {
            let energy = 0;
            for (let k = 0; k < spectrum.length; k++) {
                energy += spectrum[k] * this.melFilterBank[m][k];
            }
            melSpec[m] = energy;
        }

        return melSpec;
    }

    /**
     * Apply pre-emphasis filter to high-pass filter the signal
     */
    private applyPreEmphasisFilter(pcm: Float32Array): Float32Array {
        const result = new Float32Array(pcm.length);
        result[0] = pcm[0];
        for (let i = 1; i < pcm.length; i++) {
            result[i] = pcm[i] - this.preEmphasisCoeff * pcm[i - 1];
        }
        return result;
    }

    /**
     * Compute power spectrum using FFT (O(n log n) instead of O(n²) DFT)
     */
    private computePowerSpectralDensity(frame: Float32Array): Float32Array {
        const spectrum = new Float32Array(this.fftLength / 2 + 1);

        // Zero-pad frame to fftLength (must be power of 2, 512 = 2⁹)
        const padded = new Array(this.fftLength).fill(0);
        for (let i = 0; i < Math.min(frame.length, this.fftLength); i++) {
            padded[i] = frame[i];
        }

        // FFT returns Complex[] with .re and .im properties
        const fftResult = math.fft(padded) as Array<{ re: number; im: number }>;

        // Power spectrum: |X(k)|² = re² + im² (one-sided: first N/2+1 bins)
        for (let k = 0; k < spectrum.length; k++) {
            const re = fftResult[k].re;
            const im = fftResult[k].im;
            spectrum[k] = re * re + im * im;
        }

        return spectrum;
    }

    /**
     * Create mel filter bank matrix
     */
    private generateMelFilterBankMatrix(): number[][] {
        const filterBank: number[][] = [];

        // Convert Hz to mel scale
        const lowMel = this.hertzToMelScale(0);
        const highMel = this.hertzToMelScale(this.sampleRate / 2);

        // Create evenly spaced mel points
        const melPoints: number[] = [];
        for (let i = 0; i < this.numMelBins + 2; i++) {
            melPoints.push(lowMel + ((highMel - lowMel) * i) / (this.numMelBins + 1));
        }

        // Convert back to Hz
        const hzPoints = melPoints.map((mel) => this.melScaleToHertz(mel));

        // Convert to FFT bin indices
        const binPoints = hzPoints.map((hz) => Math.floor((hz * this.fftLength) / this.sampleRate));

        // Create triangular filters
        for (let m = 1; m <= this.numMelBins; m++) {
            const filter = new Float32Array(this.fftLength / 2 + 1);
            const left = binPoints[m - 1];
            const center = binPoints[m];
            const right = binPoints[m + 1];

            for (let k = left; k <= center; k++) {
                if (k >= 0 && k < filter.length && center > left) {
                    filter[k] = (k - left) / (center - left);
                }
            }

            for (let k = center; k <= right; k++) {
                if (k >= 0 && k < filter.length && right > center) {
                    filter[k] = (right - k) / (right - center);
                }
            }

            filterBank.push(Array.from(filter));
        }

        return filterBank;
    }

    /**
     * Convert Hz to mel scale
     * @param hz - Frequency in Hz
     * @returns Frequency in mel scale
     */
    private hertzToMelScale(hz: number): number {
        return 2595 * Math.log10(1 + hz / 700);
    }

    /**
     * Convert mel scale to Hz
     * @param mel - Frequency in mel scale
     * @returns Frequency in Hz
     */
    private melScaleToHertz(mel: number): number {
        return 700 * (10 ** (mel / 2595) - 1);
    }

    /**
     * Frame the signal into overlapping windows
     */
    private segmentSignalIntoFrames(signal: Float32Array): Float32Array[] {
        const frames: Float32Array[] = [];
        for (let i = 0; i + this.frameLength <= signal.length; i += this.frameStep) {
            const frame = signal.subarray(i, i + this.frameLength);
            frames.push(new Float32Array(frame));
        }

        return frames;
    }
}
