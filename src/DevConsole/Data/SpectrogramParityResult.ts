export enum SpectrogramParityVerdict {
    Pending = 'pending',
    Passed = 'passed',
    Failed = 'failed',
}

/** One parity run result: native DSP bridge vs the validated JS oracle. */
export class SpectrogramParityResult {
    private constructor(
        public readonly jsFrameCount: number,
        public readonly nativeFrameCount: number,
        public readonly comparedFrames: number,
        public readonly maxAbsDiff: number,
        public readonly cosineSimilarity: number,
        public readonly nativeDurationMs: number,
        public readonly verdict: SpectrogramParityVerdict,
    ) {}

    public static create(
        jsFrameCount: number,
        nativeFrameCount: number,
        comparedFrames: number,
        maxAbsDiff: number,
        cosineSimilarity: number,
        nativeDurationMs: number,
        verdict: SpectrogramParityVerdict,
    ): SpectrogramParityResult {
        return new SpectrogramParityResult(
            jsFrameCount,
            nativeFrameCount,
            comparedFrames,
            maxAbsDiff,
            cosineSimilarity,
            nativeDurationMs,
            verdict,
        );
    }
}
