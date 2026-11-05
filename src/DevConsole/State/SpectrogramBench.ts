import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { AsrMelSpectrogram } from '@/InferenceModel/Asr';
import { AudioFeatureExtractor } from '@/Math';
import { SpectrogramBenchSnapshot } from '../Data/SpectrogramBenchSnapshot';
import { SpectrogramBenchEntry, SpectrogramBenchId } from '../Data/SpectrogramBenchEntry';
import { SourceIngestException } from '../Ingest/SourceIngestException';

/**
 * SpectrogramBench – Dev-console CPU bench for the JS audio front-ends (C2).
 *
 * Runs the real DSP classes on synthesized 16 kHz PCM and reports wall-clock
 * duration per second of audio (real-time factor): log-mel 128 over the ASR
 * window length and fbank 80 over the CAM++ window length. The numbers decide
 * whether the front-end stays in JS or moves to native vDSP/Kotlin.
 */
export class SpectrogramBench {
    public static readonly SAMPLE_RATE_HZ = 16000;
    public static readonly BENCH_TONE_HZ = 440;
    public static readonly BENCH_TONE_AMPLITUDE = 0.1;
    public static readonly MEL_AUDIO_SECONDS = 28;
    public static readonly FBANK_AUDIO_SECONDS = 5;
    public static readonly MEL_FILTER_COUNT = 128;
    public static readonly MEL_FILTER_BIN_COUNT = AsrMelSpectrogram.N_FFT / 2 + 1;

    public readonly state$ = observable(SpectrogramBenchSnapshot.create());

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly melAudioSeconds: number = SpectrogramBench.MEL_AUDIO_SECONDS,
        private readonly fbankAudioSeconds: number = SpectrogramBench.FBANK_AUDIO_SECONDS,
    ) {}

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get snapshot(): SpectrogramBenchSnapshot {
        return this.state$.get();
    }

    public async run(): Promise<void> {
        this.state$.set(SpectrogramBenchSnapshot.create([], true));

        try {
            this.validateSeconds(this.melAudioSeconds);
            this.validateSeconds(this.fbankAudioSeconds);
            const entries = [this.benchMel()];
            this.state$.entries.set([...entries]);
            entries.push(this.benchFbank());
            this.state$.entries.set([...entries]);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.error.set(message);
            this.logger.error('[SpectrogramBench] failed', { message });
            throw error;
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public synthesizeToneForSeconds(audioSeconds: number): Float32Array {
        const sampleCount = Math.floor(audioSeconds * SpectrogramBench.SAMPLE_RATE_HZ);
        const signal = new Float32Array(sampleCount);
        for (let index = 0; index < sampleCount; index += 1) {
            signal[index] =
                SpectrogramBench.BENCH_TONE_AMPLITUDE *
                Math.sin((2 * Math.PI * SpectrogramBench.BENCH_TONE_HZ * index) / SpectrogramBench.SAMPLE_RATE_HZ);
        }

        return signal;
    }

    private benchMel(): SpectrogramBenchEntry {
        const spectrogram = AsrMelSpectrogram.create(SpectrogramBench.createFlatMelFilters());
        const samples = this.synthesizeToneForSeconds(this.melAudioSeconds);
        const start = performance.now();
        spectrogram.compute(samples);

        return SpectrogramBenchEntry.create(
            SpectrogramBenchId.Mel128,
            'Log-mel 128 (Parakeet front-end)',
            this.melAudioSeconds,
            performance.now() - start,
        );
    }

    private benchFbank(): SpectrogramBenchEntry {
        const extractor = new AudioFeatureExtractor();
        const samples = this.synthesizeToneForSeconds(this.fbankAudioSeconds);
        const start = performance.now();
        extractor.extract(samples);

        return SpectrogramBenchEntry.create(
            SpectrogramBenchId.Fbank80,
            'Fbank 80 (CAM++ front-end, mathjs)',
            this.fbankAudioSeconds,
            performance.now() - start,
        );
    }

    private static createFlatMelFilters(): readonly (readonly number[])[] {
        return Array.from({ length: SpectrogramBench.MEL_FILTER_COUNT }, () =>
            new Array<number>(SpectrogramBench.MEL_FILTER_BIN_COUNT).fill(1),
        );
    }

    private validateSeconds(audioSeconds: number): void {
        if (!(audioSeconds > 0)) {
            throw new SourceIngestException(
                `Front-end bench requires positive audio seconds, received ${audioSeconds}`,
                'BENCH_INVALID_SECONDS',
            );
        }
    }
}

Container.register(
    SpectrogramBench,
    () => new SpectrogramBench(Container.get(AppLogger)),
);
