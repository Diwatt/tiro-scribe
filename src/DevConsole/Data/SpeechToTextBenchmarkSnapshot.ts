import type { SpeechToTextBenchmarkResult } from './SpeechToTextBenchmarkResult';

/** Dataclass holding the observable snapshot of {@link SpeechToTextBenchmark}. */
export class SpeechToTextBenchmarkSnapshot {
    private constructor(
        public readonly isLoading: boolean,
        public readonly result: SpeechToTextBenchmarkResult | null,
        public readonly error: string | null,
    ) {}

    public static create(
        isLoading = false,
        result: SpeechToTextBenchmarkResult | null = null,
        error: string | null = null,
    ): SpeechToTextBenchmarkSnapshot {
        return new SpeechToTextBenchmarkSnapshot(isLoading, result, error);
    }
}
