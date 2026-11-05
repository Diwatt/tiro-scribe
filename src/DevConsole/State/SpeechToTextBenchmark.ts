import { observable } from '@legendapp/state';
import { documentDirectory } from 'expo-file-system/legacy';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { ParakeetRunnerFactory } from '../Benchmark/ParakeetRunnerFactory';
import { SpeechToTextBenchmarkResult } from '../Data/SpeechToTextBenchmarkResult';
import { SpeechToTextBenchmarkSnapshot } from '../Data/SpeechToTextBenchmarkSnapshot';
import { AudioSegmentExtractor } from '../Ingest/AudioSegmentExtractor';

/** A loaded speech-to-text runner (engine-agnostic: ExecuTorch Whisper today). */
export interface SpeechToTextRunner {
    transcribe(audio: Float32Array, language: string): Promise<string>;
    dispose(): Promise<void>;
}

/** Creates a runner, loading the model (remote URL or local path). */
export interface SpeechToTextRunnerFactory {
    create(): Promise<SpeechToTextRunner>;
}

export class SpeechToTextBenchmark {
    private static readonly SAMPLE_RATE_HZ = 16000;
    private static readonly MS_PER_SECOND = 1000;
    private static readonly DEFAULT_WAV_FILE_NAME = 'gloria_short_60s.wav';
    private static readonly DEFAULT_LANGUAGE = 'en';
    // Bare paths (no file:// prefix): the native ExecuTorch loader rejects URIs
    private static readonly DEFAULT_WAV_PATH =
        `${(documentDirectory ?? '').replace('file://', '')}${SpeechToTextBenchmark.DEFAULT_WAV_FILE_NAME}`;

    public readonly state$ = observable(SpeechToTextBenchmarkSnapshot.create());
    public readonly wavPath$ = observable(SpeechToTextBenchmark.DEFAULT_WAV_PATH);
    public readonly language$ = observable(SpeechToTextBenchmark.DEFAULT_LANGUAGE);

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly segmentExtractor: AudioSegmentExtractor,
        private readonly runnerFactory: SpeechToTextRunnerFactory,
    ) {}

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get snapshot(): SpeechToTextBenchmarkSnapshot {
        return SpeechToTextBenchmarkSnapshot.create(
            this.state$.isLoading.get(),
            this.state$.result.get(),
            this.state$.error.get(),
        );
    }

    public setWavPath(path: string): void {
        this.wavPath$.set(path);
    }

    public setLanguage(language: string): void {
        this.language$.set(language);
    }

    public async runFromForm(): Promise<void> {
        await this.run(this.wavPath$.get(), this.language$.get());
    }

    public async run(wavPath: string, language: string): Promise<void> {
        if (language.length === 0) {
            throw new Error('Language is required');
        }

        this.state$.set({ ...SpeechToTextBenchmarkSnapshot.create(), isLoading: true });

        try {
            const audio = await this.segmentExtractor.readFullPcm(wavPath);
            if (audio.length === 0) {
                throw new Error('Audio is empty');
            }

            const audioDurationMs = Math.round(
                (audio.length / SpeechToTextBenchmark.SAMPLE_RATE_HZ) * SpeechToTextBenchmark.MS_PER_SECOND,
            );

            const loadStartedAtMs = Date.now();
            const runner = await this.runnerFactory.create();
            const loadLatencyMs = Date.now() - loadStartedAtMs;

            const transcribeStartedAtMs = Date.now();
            const transcript = await runner.transcribe(audio, language);
            const latencyMs = Date.now() - transcribeStartedAtMs;

            await runner.dispose();

            // Real-time factor: processing time / audio duration (< 1 means faster than real time).
            const rtf = audioDurationMs > 0 ? latencyMs / audioDurationMs : 0;
            const result = SpeechToTextBenchmarkResult.create(
                transcript,
                audioDurationMs,
                loadLatencyMs,
                latencyMs,
                rtf,
            );

            this.state$.result.set(result);
            this.logger.debug('[SpeechToTextBenchmark] done', {
                transcriptPreview: transcript.slice(0, 200),
                loadLatencyMs,
                latencyMs,
                audioDurationMs,
                rtf,
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.error.set(message);
            this.logger.error('[SpeechToTextBenchmark] failed', { message });
            throw error;
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public dismissError(): void {
        this.state$.error.set(null);
    }
}

Container.register(
    SpeechToTextBenchmark,
    () =>
        new SpeechToTextBenchmark(
            Container.get(AppLogger),
            Container.get(AudioSegmentExtractor),
            Container.get(ParakeetRunnerFactory),
        ),
);
