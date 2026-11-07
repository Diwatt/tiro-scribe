import { PipelineException } from '@/Exception';
import { AsrRunInput } from './AsrRunInput';
import { AudioSegment } from './AudioSegment';

/**
 * AsrRunInputBuilder - builds the next AsrRunInput incrementally: it stores
 * the windows handed over by the AudioCutter, remembers which stream time
 * each stored run of windows corresponds to, and packs everything into an
 * AsrRunInput once the ~28 s window budget is reached. Pure mechanics: it
 * never decides when a segment should close, it only commits or removes the
 * windows of the segment the AudioCutter tells it about.
 */
export class AsrRunInputBuilder {
    public static readonly MAX_DURATION_MS = 28000;

    /** Segments committed by closeSegment, in stream order. */
    private segments: AudioSegment[] = [];
    /** Frozen ASR window budget in samples: MAX_DURATION_MS at the stream sample rate. */
    private maxSamples = 0;
    private sampleRateHz = 0;
    /** Windows of the input under construction, in stream order; trimmed gaps never arrive here. */
    private storedWindows: Float32Array[] = [];
    private windowSamples = 0;
    /** Windows of the segment currently open: always the tail of storedWindows. */
    private openSegmentNbWindows = 0;

    public constructor(windowSamples: number, sampleRateHz: number) {
        if (windowSamples <= 0 || sampleRateHz <= 0) {
            throw new PipelineException(
                `AsrRunInputBuilder requires a positive window size and sample rate, got ${windowSamples} / ${sampleRateHz}`,
            );
        }

        this.windowSamples = windowSamples;
        this.sampleRateHz = sampleRateHz;
        this.maxSamples = Math.floor((AsrRunInputBuilder.MAX_DURATION_MS * sampleRateHz) / 1000);
    }

    /** Whether the input under construction can still store the given number of incoming windows. */
    public canAccept(nbWindows: number): boolean {
        return (this.storedWindows.length + nbWindows) * this.windowSamples <= this.maxSamples;
    }

    /** Stores the pre-roll windows and opens the segment boundary on them. */
    public openSegment(preRollWindows: readonly Float32Array[]): void {
        this.openSegmentNbWindows = preRollWindows.length;
        for (const preRollWindow of preRollWindows) {
            this.storedWindows.push(preRollWindow);
        }
    }

    public store(window: Float32Array): void {
        this.openSegmentNbWindows += 1;
        this.storedWindows.push(window);
    }

    /** Commits the stored windows of the open segment as one stream-anchored segment. */
    public closeSegment(streamEndSample: number): void {
        const segmentStartSample = streamEndSample - this.openSegmentNbWindows * this.windowSamples;
        this.segments.push(
            AudioSegment.create(
                this.toMilliseconds(segmentStartSample),
                this.toMilliseconds(streamEndSample),
                (this.storedWindows.length - this.openSegmentNbWindows) * this.windowSamples,
                this.openSegmentNbWindows * this.windowSamples,
                segmentStartSample,
            ),
        );
        this.openSegmentNbWindows = 0;
    }

    /** Removes the stored windows of the open segment; nothing else moves. */
    public dropSegment(): void {
        this.storedWindows.splice(this.storedWindows.length - this.openSegmentNbWindows, this.openSegmentNbWindows);
        this.openSegmentNbWindows = 0;
    }

    /** Assembles and returns the input under construction, or null when no segment survived. */
    public flush(streamEndSample: number): AsrRunInput | null {
        if (this.segments.length === 0) {
            this.reset();

            return null;
        }

        const input = AsrRunInput.create(
            this.sampleRateHz,
            this.toMilliseconds(this.segments[0].streamStartSample),
            this.toMilliseconds(streamEndSample),
            this.segments,
            AsrRunInputBuilder.concat(this.storedWindows),
        );
        this.reset();

        return input;
    }

    public reset(): void {
        this.segments = [];
        this.storedWindows = [];
        this.openSegmentNbWindows = 0;
    }

    private toMilliseconds(samples: number): number {
        return Math.round((samples / this.sampleRateHz) * 1000);
    }

    private static concat(windows: Float32Array[]): Float32Array {
        let total = 0;
        for (const window of windows) {
            total += window.length;
        }

        const merged = new Float32Array(total);
        let offset = 0;
        for (const window of windows) {
            merged.set(window, offset);
            offset += window.length;
        }

        return merged;
    }
}
