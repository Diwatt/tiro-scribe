export enum SpectrogramBenchId {
    Mel128 = 'mel-128',
    Fbank80 = 'fbank-80',
}

/** One front-end timing line: wall-clock duration of a DSP pass over N seconds of audio. */
export class SpectrogramBenchEntry {
    private constructor(
        public readonly id: SpectrogramBenchId,
        public readonly label: string,
        public readonly audioSeconds: number,
        public readonly durationMs: number,
        public readonly realTimeFactor: number,
    ) {}

    public static create(
        id: SpectrogramBenchId,
        label: string,
        audioSeconds: number,
        durationMs: number,
    ): SpectrogramBenchEntry {
        return new SpectrogramBenchEntry(id, label, audioSeconds, durationMs, durationMs / (audioSeconds * 1000));
    }
}
