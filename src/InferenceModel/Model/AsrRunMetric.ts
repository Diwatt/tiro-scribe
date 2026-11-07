/**
 * AsrRunMetric – transcript plus raw token positions and per-phase timings of
 * one ASR run. tokenIds + frameIndexes let the pipeline re-attribute tokens to
 * their original VAD spans; phase timings (mel, encoder, decoder) isolate the
 * cost of the native front-end, the frozen encoder program and the TDT decode
 * loop.
 */
export class AsrRunMetric {
    private constructor(
        public readonly text: string,
        public readonly tokenIds: readonly number[],
        public readonly frameIndexes: readonly number[],
        public readonly melMs: number,
        public readonly encoderMs: number,
        public readonly decoderMs: number,
        public readonly totalMs: number,
        public readonly iterationCount: number,
        public readonly decoderSteps: number,
    ) {}

    public static create(
        text: string,
        tokenIds: readonly number[],
        frameIndexes: readonly number[],
        melMs: number,
        encoderMs: number,
        decoderMs: number,
        totalMs: number,
        iterationCount: number,
        decoderSteps: number,
    ): AsrRunMetric {
        return new AsrRunMetric(
            text,
            tokenIds,
            frameIndexes,
            melMs,
            encoderMs,
            decoderMs,
            totalMs,
            iterationCount,
            decoderSteps,
        );
    }
}
