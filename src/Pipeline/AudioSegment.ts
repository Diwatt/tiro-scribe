/**
 * AudioSegment - one voice segment detected by the VAD inside an AsrRunInput:
 * absolute stream-clock boundaries plus where its stored samples sit in the
 * input. Trimmed gaps between segments are excluded from the stored samples
 * while their duration keeps counting on the stream clock, so an input offset
 * maps back to the stream time through the segments.
 */
export class AudioSegment {
    private constructor(
        public readonly startMs: number,
        public readonly endMs: number,
        public readonly offsetInInput: number,
        public readonly nbSamples: number,
        public readonly streamStartSample: number,
    ) {}

    public static create(
        startMs: number,
        endMs: number,
        offsetInInput: number,
        nbSamples: number,
        streamStartSample: number,
    ): AudioSegment {
        return new AudioSegment(startMs, endMs, offsetInInput, nbSamples, streamStartSample);
    }

    public getDurationMs(): number {
        return this.endMs - this.startMs;
    }

    public getEndInInput(): number {
        return this.offsetInInput + this.nbSamples;
    }

    public getStreamEndSample(): number {
        return this.streamStartSample + this.nbSamples;
    }
}
