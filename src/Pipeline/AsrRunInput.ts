import { PipelineException } from '@/Exception';
import type { AudioSegment } from './AudioSegment';

/**
 * AsrRunInput - the audio handed to a single ASR run: up to ~28 s of stored
 * samples calibrated to the frozen encoder window, covering a much longer
 * real time. Trailing silences between audio segments are trimmed from the
 * stored audio while their duration keeps counting on the stream clock.
 * Segments keep their original VAD boundaries; tokens map back to a segment
 * through absoluteMsAt and segmentIndexAt.
 */
export class AsrRunInput {
    private constructor(
        public readonly startMs: number,
        public readonly endMs: number,
        private readonly sampleRateHz: number,
        private readonly segments: readonly AudioSegment[],
        private readonly samples: Float32Array,
    ) {}

    public static create(
        sampleRateHz: number,
        startMs: number,
        endMs: number,
        segments: readonly AudioSegment[],
        samples: Float32Array,
    ): AsrRunInput {
        if (segments.length === 0) {
            throw new PipelineException(`AsrRunInput requires at least one segment (got 0)`);
        }

        const storedNbSamples = AsrRunInput.validateSegments(segments);
        if (storedNbSamples !== samples.length) {
            throw new PipelineException(
                `AsrRunInput segments must account for every stored sample (stored ${storedNbSamples}, samples ${samples.length})`,
            );
        }

        return new AsrRunInput(startMs, endMs, sampleRateHz, segments, samples);
    }

    /** Checks the segments tile the stored samples contiguously; returns their total sample count. */
    private static validateSegments(segments: readonly AudioSegment[]): number {
        let endInInput = 0;
        for (const segment of segments) {
            if (segment.offsetInInput !== endInInput) {
                throw new PipelineException(
                    `AsrRunInput segments must tile the stored samples contiguously (got offset ${segment.offsetInInput}, expected ${endInInput})`,
                );
            }
            endInInput += segment.nbSamples;
        }

        return endInInput;
    }

    public getSamples(): Float32Array {
        return this.samples;
    }

    public getSegments(): readonly AudioSegment[] {
        return this.segments;
    }

    /** Absolute stream time of a token emitted at the given input time offset. */
    public absoluteMsAt(inputOffsetMs: number): number {
        const offsetSample = Math.round((inputOffsetMs / 1000) * this.sampleRateHz);
        const segment = this.findSegmentAt(offsetSample);
        const relativeSample = Math.max(0, offsetSample - segment.offsetInInput);
        const absoluteSample = Math.min(segment.getStreamEndSample(), segment.streamStartSample + relativeSample);

        return (absoluteSample / this.sampleRateHz) * 1000;
    }

    /** Index of the segment holding the given absolute time, clamped to the outermost segments. */
    public segmentIndexAt(absoluteMs: number): number {
        let index = this.segments.length - 1;
        for (let segmentIndex = 0; segmentIndex < this.segments.length; segmentIndex += 1) {
            if (absoluteMs < this.segments[segmentIndex].endMs) {
                index = segmentIndex;
                break;
            }
        }

        return index;
    }

    private findSegmentAt(offsetSample: number): AudioSegment {
        let candidate = this.segments[this.segments.length - 1];
        for (const segment of this.segments) {
            candidate = segment;
            if (offsetSample < segment.getEndInInput()) {
                break;
            }
        }

        return candidate;
    }
}
