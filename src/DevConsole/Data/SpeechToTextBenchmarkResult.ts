/** Dataclass holding the metrics of one speech-to-text benchmark run. */
export class SpeechToTextBenchmarkResult {
    private constructor(
        public readonly transcript: string,
        public readonly audioDurationMs: number,
        public readonly loadLatencyMs: number,
        public readonly latencyMs: number,
        public readonly rtf: number,
    ) {}

    public static create(
        transcript: string,
        audioDurationMs: number,
        loadLatencyMs: number,
        latencyMs: number,
        rtf: number,
    ): SpeechToTextBenchmarkResult {
        return new SpeechToTextBenchmarkResult(transcript, audioDurationMs, loadLatencyMs, latencyMs, rtf);
    }
}
