/**
 * Represents a time-based segment within an audio file.
 * Immutable value object used for extraction and calibration.
 */
export class AudioSegment {
    public constructor(
        public readonly startMs: number,
        public readonly endMs: number,
    ) {}

    public get durationMs(): number {
        return this.endMs - this.startMs;
    }

    public isValid(): boolean {
        return this.startMs >= 0 && this.endMs > this.startMs;
    }
}
