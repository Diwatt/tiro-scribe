/**
 * SpeechSegment - one contiguous speech span cut out of the stream by the
 * SpeechSegmenter, from the first pre-roll window to the last trailing silence
 * window. Times are on the absolute sample clock of the source stream.
 */
export class SpeechSegment {
    public constructor(
        public readonly startMs: number,
        public readonly endMs: number,
        public readonly samples: Float32Array,
    ) {}

    public getDurationMs(): number {
        return this.endMs - this.startMs;
    }
}
