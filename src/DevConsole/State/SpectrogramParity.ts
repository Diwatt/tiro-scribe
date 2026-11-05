import { observable } from '@legendapp/state';
import { documentDirectory } from 'expo-file-system/legacy';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Asr } from '@/InferenceModel/Model';
import { AsrMelSpectrogram } from '@/InferenceModel/Asr';
import { LogMelSpectrogramOptions, MelSpectrogram, MelSpectrogramExtractor } from '@/InferenceModel/Spectrogram';
import type { MelSpectrogramExtractorInterface } from '@/InferenceModel/Spectrogram';
import { AudioFileReader } from '../Ingest/AudioFileReader';
import { SourceIngestException } from '../Ingest/SourceIngestException';
import { SpectrogramParityResult, SpectrogramParityVerdict } from '../Data/SpectrogramParityResult';
import { SpectrogramParitySnapshot } from '../Data/SpectrogramParitySnapshot';
import { AudioSegmentExtractor } from '../Ingest/AudioSegmentExtractor';
import { PcmSampleConverter } from '@/Math';

/**
 * SpectrogramParity – Dev-console golden test (C2): runs the same PCM through the
 * validated JS log-mel oracle (AsrMelSpectrogram + MelNormalizer) and through the
 * native MelSpectrogramExtractor, then compares the two spectrograms. A PASS
 * here authorizes wiring the models to the native front-end; a FAIL blocks it.
 */
export class SpectrogramParity {
    public static readonly MAX_ABS_DIFF_THRESHOLD = 0.001;
    public static readonly COSINE_SIMILARITY_THRESHOLD = 0.9999;
    public static readonly SAMPLE_RATE_HZ = 16000;
    public static readonly NUM_MEL_BINS = AsrMelSpectrogram.NUM_MELS;
    public static readonly FRAME_SHIFT_MS = 10;
    public static readonly FRAME_LENGTH_MS = 25;
    public static readonly PREEMPH_COEFF = 0.97;
    private static readonly DEFAULT_WAV_FILE_NAME = 'speech_thomas_16k.wav';
    private static readonly DEFAULT_FILTERS_FILE_NAME = 'mel_filters.json';

    public readonly state$ = observable(SpectrogramParitySnapshot.create());
    public readonly wavPath$ = observable(SpectrogramParity.createDefaultWavPath());
    public readonly filtersPath$ = observable(SpectrogramParity.createDefaultFiltersPath());

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly segmentExtractor: AudioSegmentExtractor = Container.get(AudioSegmentExtractor),
        private readonly converter: PcmSampleConverter = Container.get(PcmSampleConverter),
        private readonly fileReader: AudioFileReader = Container.get(AudioFileReader),
        private readonly extractor: MelSpectrogramExtractorInterface = Container.get(MelSpectrogramExtractor),
    ) {}

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get snapshot(): SpectrogramParitySnapshot {
        return this.state$.get();
    }

    public setWavPath(path: string): void {
        this.wavPath$.set(path);
    }

    public setFiltersPath(path: string): void {
        this.filtersPath$.set(path);
    }

    public async run(): Promise<void> {
        this.state$.set(SpectrogramParitySnapshot.create(null, true));

        try {
            const pcm = await this.segmentExtractor.readFullPcm(this.wavPath$.get());
            if (pcm.length === 0) {
                throw new SourceIngestException('Parity audio is empty', 'PARITY_AUDIO_EMPTY');
            }
            const filters = await this.loadMelFilters();

            const jsMel = AsrMelSpectrogram.create(filters.data).compute(pcm);
            const jsValidFrames = Math.floor(pcm.length / AsrMelSpectrogram.HOP_LENGTH);

            const pcm16 = this.converter.float32ToInt16(pcm);
            const options = LogMelSpectrogramOptions.create(
                SpectrogramParity.SAMPLE_RATE_HZ,
                SpectrogramParity.NUM_MEL_BINS,
                SpectrogramParity.FRAME_SHIFT_MS,
                SpectrogramParity.FRAME_LENGTH_MS,
                SpectrogramParity.PREEMPH_COEFF,
            );
            const nativeStart = performance.now();
            const nativeSpectrogram = await this.extractor.extractLogMelSpectrogram(pcm16, options);
            const nativeDurationMs = performance.now() - nativeStart;

            const result = this.compare(jsMel, jsValidFrames, nativeSpectrogram, nativeDurationMs);
            this.state$.result.set(result);
            this.logger.info('[SpectrogramParity] completed', { verdict: result.verdict });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.error.set(message);
            this.logger.error('[SpectrogramParity] failed', { message });
            throw error;
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    private async loadMelFilters() {
        const text = await this.fileReader.readText(this.filtersPath$.get());

        return AsrMelSpectrogram.FILTERS_SCHEMA.parse(JSON.parse(text));
    }

    private compare(
        jsMel: Float32Array,
        jsValidFrames: number,
        native: MelSpectrogram,
        nativeDurationMs: number,
    ): SpectrogramParityResult {
        const comparedFrames = Math.min(jsValidFrames, native.frameCount);
        const numBins = SpectrogramParity.NUM_MEL_BINS;
        if (comparedFrames <= 0) {
            throw new SourceIngestException(
                `No overlapping frames between JS (${jsValidFrames}) and native (${native.frameCount})`,
                'PARITY_NO_OVERLAP',
            );
        }

        let maxAbsDiff = 0;
        let dot = 0;
        let jsSquareSum = 0;
        let nativeSquareSum = 0;
        for (let frame = 0; frame < comparedFrames; frame += 1) {
            for (let bin = 0; bin < numBins; bin += 1) {
                const jsValue = jsMel[frame * numBins + bin];
                const nativeValue = native.values[frame * numBins + bin];
                const diff = Math.abs(jsValue - nativeValue);
                if (diff > maxAbsDiff) {
                    maxAbsDiff = diff;
                }
                dot += jsValue * nativeValue;
                jsSquareSum += jsValue * jsValue;
                nativeSquareSum += nativeValue * nativeValue;
            }
        }
        const cosine =
            jsSquareSum > 0 && nativeSquareSum > 0
                ? dot / (Math.sqrt(jsSquareSum) * Math.sqrt(nativeSquareSum))
                : 0;
        const verdict =
            maxAbsDiff <= SpectrogramParity.MAX_ABS_DIFF_THRESHOLD &&
            cosine >= SpectrogramParity.COSINE_SIMILARITY_THRESHOLD
                ? SpectrogramParityVerdict.Passed
                : SpectrogramParityVerdict.Failed;

        return SpectrogramParityResult.create(
            jsValidFrames,
            native.frameCount,
            comparedFrames,
            maxAbsDiff,
            cosine,
            nativeDurationMs,
            verdict,
        );
    }

    private static createDefaultWavPath(): string {
        return `${(documentDirectory ?? '').replace('file://', '')}${SpectrogramParity.DEFAULT_WAV_FILE_NAME}`;
    }

    private static createDefaultFiltersPath(): string {
        return `${(documentDirectory ?? '').replace('file://', '')}${SpectrogramParity.DEFAULT_FILTERS_FILE_NAME}`;
    }
}

Container.register(
    SpectrogramParity,
    () =>
        new SpectrogramParity(
            Container.get(AppLogger),
            Container.get(AudioSegmentExtractor),
            Container.get(PcmSampleConverter),
            Container.get(AudioFileReader),
            Container.get(MelSpectrogramExtractor),
        ),
);
