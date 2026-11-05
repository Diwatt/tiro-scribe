import { z } from 'zod';
import { AsrException } from '@/Exception';
import { FftTransformer } from '@/Math';
import { MelNormalizer } from './MelNormalizer';
import { MelProjector } from './MelProjector';

/**
 * Log-mel spectrogram faithful to the HuggingFace ParakeetFeatureExtractor:
 * preemphasis, centered STFT (constant pad n_fft/2), hann window zero-padded to
 * n_fft, power spectrum, slaney mel projection, log with zero guard, per-bin
 * normalization over valid frames. Requires n_fft to be a power of two.
 * Orchestrates FftTransformer, MelProjector and MelNormalizer.
 */
export class AsrMelSpectrogram {
    public static readonly NUM_MELS = 128;
    public static readonly HOP_LENGTH = 160;
    public static readonly N_FFT = 512;
    public static readonly WIN_LENGTH = 400;
    public static readonly PREEMPHASIS = 0.97;
    public static readonly EPSILON = 1e-5;
    public static readonly LOG_GUARD = 2 ** -24;
    public static readonly FILTERS_SCHEMA = z.object({
        rows: z.number().int(),
        cols: z.number().int(),
        data: z.array(z.array(z.number())),
    });

    private readonly melFilters: readonly (readonly number[])[];
    private readonly numFrequencyBins: number;
    private readonly window: Float64Array;
    private readonly fftTransformer: FftTransformer;
    private readonly melProjector: MelProjector;
    private readonly melNormalizer: MelNormalizer;
    private readonly realBuffer: Float64Array;
    private readonly imaginaryBuffer: Float64Array;

    public static create(melFilters: readonly (readonly number[])[]): AsrMelSpectrogram {
        const numMels = melFilters.length;
        const numFrequencyBins = melFilters[0]?.length ?? 0;
        const expectedFrequencyBins = AsrMelSpectrogram.N_FFT / 2 + 1;
        const hasRaggedRows = melFilters.some((row) => row.length !== numFrequencyBins);
        if (numMels !== AsrMelSpectrogram.NUM_MELS || numFrequencyBins !== expectedFrequencyBins || hasRaggedRows) {
            throw new AsrException(
                `Mel filters shape ${numMels}x${numFrequencyBins} does not match ${AsrMelSpectrogram.NUM_MELS}x${expectedFrequencyBins}`,
            );
        }

        return new AsrMelSpectrogram(melFilters);
    }

    private constructor(melFilters: readonly (readonly number[])[]) {
        this.melFilters = melFilters;
        this.numFrequencyBins = melFilters[0]?.length ?? 0;
        this.window = this.buildWindow(AsrMelSpectrogram.WIN_LENGTH, AsrMelSpectrogram.N_FFT);
        this.fftTransformer = new FftTransformer(AsrMelSpectrogram.N_FFT);
        this.melProjector = new MelProjector(
            this.melFilters,
            AsrMelSpectrogram.NUM_MELS,
            this.numFrequencyBins,
            AsrMelSpectrogram.LOG_GUARD,
        );
        this.melNormalizer = new MelNormalizer(AsrMelSpectrogram.NUM_MELS, AsrMelSpectrogram.EPSILON);
        this.realBuffer = new Float64Array(AsrMelSpectrogram.N_FFT);
        this.imaginaryBuffer = new Float64Array(AsrMelSpectrogram.N_FFT);
    }

    public compute(samples: Float32Array): Float32Array {
        const extraction = this.extractLogMel(samples);

        return this.melNormalizer.normalize(extraction.data, extraction.featuresLength);
    }

    public computeRaw(samples: Float32Array): Float32Array {
        return Float32Array.from(this.extractLogMel(samples).data);
    }

    private buildWindow(winLength: number, nFft: number): Float64Array {
        const window = new Float64Array(nFft);
        const offset = (nFft - winLength) / 2;
        for (let index = 0; index < winLength; index += 1) {
            window[offset + index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (winLength - 1)));
        }

        return window;
    }

    private extractLogMel(samples: Float32Array) {
        const { HOP_LENGTH, N_FFT, NUM_MELS, PREEMPHASIS } = AsrMelSpectrogram;
        const paddedLength = samples.length + N_FFT;
        const padded = new Float64Array(paddedLength);
        const offset = N_FFT / 2;
        padded[offset] = samples[0];
        for (let index = 1; index < samples.length; index += 1) {
            padded[offset + index] = samples[index] - PREEMPHASIS * samples[index - 1];
        }

        const frameCount = Math.floor(samples.length / HOP_LENGTH) + 1;
        const featuresLength = Math.floor(samples.length / HOP_LENGTH);
        const data = new Float64Array(frameCount * NUM_MELS);
        for (let frame = 0; frame < frameCount; frame += 1) {
            this.windowFrame(padded, frame * HOP_LENGTH);
            this.melProjector.projectLogMel(this.realBuffer, this.imaginaryBuffer, data, frame * NUM_MELS);
        }

        return { data, frameCount, featuresLength };
    }

    private windowFrame(padded: Float64Array, start: number): void {
        for (let index = 0; index < AsrMelSpectrogram.N_FFT; index += 1) {
            this.realBuffer[index] = padded[start + index] * this.window[index];
            this.imaginaryBuffer[index] = 0;
        }
        this.fftTransformer.transform(this.realBuffer, this.imaginaryBuffer);
    }
}
