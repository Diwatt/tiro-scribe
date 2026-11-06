/**
 * AsrRunMetric – transcript plus per-phase timings and decode counters of one
 * ASR run. Phase timings (mel, encoder, decoder) isolate the cost of the native
 * front-end, the frozen encoder program and the TDT decode loop.
 */
export class AsrRunMetric {
    private constructor(
        public readonly text: string,
        public readonly melMs: number,
        public readonly encoderMs: number,
        public readonly decoderMs: number,
        public readonly totalMs: number,
        public readonly iterationCount: number,
        public readonly decoderSteps: number,
        public readonly tokenCount: number,
    ) {}

    public static create(
        text: string,
        melMs: number,
        encoderMs: number,
        decoderMs: number,
        totalMs: number,
        iterationCount: number,
        decoderSteps: number,
        tokenCount: number,
    ): AsrRunMetric {
        return new AsrRunMetric(
            text,
            melMs,
            encoderMs,
            decoderMs,
            totalMs,
            iterationCount,
            decoderSteps,
            tokenCount,
        );
    }
}
