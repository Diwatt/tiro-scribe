import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { AudioSegmentExtractor } from './AudioSegmentExtractor';

/** A loaded speech-to-text runner (engine-agnostic: ExecuTorch Whisper today). */
export interface SpeechToTextRunner {
    transcribe(audio: Float32Array, language: string): Promise<string>;
    dispose(): Promise<void>;
}

/** Creates a runner, loading the model (remote URL or local path). */
export interface SpeechToTextRunnerFactory {
    create(): Promise<SpeechToTextRunner>;
}

/** Benchmark metrics for one transcription. */
export interface SpeechToTextBenchmarkResult {
    transcript: string;
    audioDurationMs: number;
    loadLatencyMs: number;
    latencyMs: number;
    rtf: number;
}

interface SpeechToTextBenchmarkSnapshot {
    isLoading: boolean;
    result: SpeechToTextBenchmarkResult | null;
    error: string | null;
}

const INITIAL_STATE: SpeechToTextBenchmarkSnapshot = {
    isLoading: false,
    result: null,
    error: null,
};

export class SpeechToTextBenchmark {
    private static readonly SAMPLE_RATE_HZ = 16000;
    private static readonly MS_PER_SECOND = 1000;

    public readonly state$ = observable(INITIAL_STATE);

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly segmentExtractor: AudioSegmentExtractor,
        private readonly runnerFactory: SpeechToTextRunnerFactory,
    ) {}

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get snapshot(): SpeechToTextBenchmarkSnapshot {
        return {
            isLoading: this.state$.isLoading.get(),
            result: this.state$.result.get(),
            error: this.state$.error.get(),
        };
    }

    public async run(wavPath: string, language: string): Promise<void> {
        if (language.length === 0) {
            throw new Error('Language is required');
        }

        this.state$.set({ ...INITIAL_STATE, isLoading: true });

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

            // Real-time factor: temps de traitement / durée audio (< 1 = plus rapide que le temps réel).
            const rtf = audioDurationMs > 0 ? latencyMs / audioDurationMs : 0;
            const result: SpeechToTextBenchmarkResult = {
                transcript,
                audioDurationMs,
                loadLatencyMs,
                latencyMs,
                rtf,
            };

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
