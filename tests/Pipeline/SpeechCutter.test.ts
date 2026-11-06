/**
 * SpeechCutter Tests - ZOMBIE Methodology
 *
 * Z - Zero: silence only, no speech at all
 * O - One: a single short spoken segment
 * M - Many: successive segments, pauses inside speech
 * B - Boundaries: min/max duration edges, pre-roll edges
 * I - Interfaces: contract - cut one VAD window at a time
 * E - Exceptions: wrong window size, invalid constructor args
 */

import { PipelineException } from '@/Exception';
import { SpeechCutter } from '../../src/Pipeline/SpeechCutter';
import { SpeechSegment } from '../../src/Pipeline/SpeechSegment';

const WINDOW_SAMPLES = 512;
const SAMPLE_RATE_HZ = 16000;
const WINDOW_MS = 32;
const VOICED = 0.9;
const SILENT = 0.1;

function samplesOf(length: number): Float32Array {
    return new Float32Array(length);
}

function cutWindows(
    cutter: SpeechCutter,
    speechProbability: number,
    windowCount: number,
): SpeechSegment[] {
    const emitted: SpeechSegment[] = [];

    for (let index = 0; index < windowCount; index += 1) {
        const segment = cutter.cut(samplesOf(WINDOW_SAMPLES), speechProbability);
        if (segment !== null) {
            emitted.push(segment);
        }
    }

    return emitted;
}

describe('SpeechCutter - ZOMBIE Tests', () => {
    describe('Z - Zero Tests', () => {
        it('should emit nothing when the stream stays silent', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            const segments = cutWindows(cutter, SILENT, 100);

            expect(segments).toEqual([]);
            expect(cutter.endOfStream()).toBeNull();
        });

        it('should not emit anything on the opening voiced window', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            expect(cutter.cut(samplesOf(WINDOW_SAMPLES), VOICED)).toBeNull();
        });

        it('should emit nothing at end of stream while waiting for speech', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 10);

            expect(cutter.endOfStream()).toBeNull();
        });
    });

    describe('O - One Tests', () => {
        it('should emit one segment with pre-roll, speech and trailing silence windows', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            const opened = cutWindows(cutter, VOICED, 100);
            const closed = cutWindows(cutter, SILENT, 3);

            expect(opened).toEqual([]);
            expect(closed.length).toBe(1);

            const segment = closed[0];
            expect(segment.startMs).toBe(50 * WINDOW_MS);
            expect(segment.endMs).toBe(163 * WINDOW_MS);
            expect(segment.getDurationMs()).toBe(113 * WINDOW_MS);
            expect(segment.samples.length).toBe(113 * WINDOW_SAMPLES);
        });
    });

    describe('M - Many Tests', () => {
        it('should emit successive segments with monotonic offsets', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            const first = cutWindows(cutter, SILENT, 3);
            cutWindows(cutter, VOICED, 80);
            const second = cutWindows(cutter, SILENT, 3);

            expect(first.length).toBe(1);
            expect(second.length).toBe(1);
            expect(first[0].endMs).toBeLessThanOrEqual(second[0].startMs);
            expect(second[0].getDurationMs()).toBeGreaterThanOrEqual(
                SpeechCutter.MIN_SEGMENT_DURATION_MS,
            );
        });

        it('should keep one segment across a brief pause shorter than the silence window count', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            const pause = cutWindows(cutter, SILENT, 2);
            const resumed = cutWindows(cutter, VOICED, 50);
            const closed = cutWindows(cutter, SILENT, 3);

            expect(pause).toEqual([]);
            expect(resumed).toEqual([]);
            expect(closed.length).toBe(1);
            expect(closed[0].getDurationMs()).toBe(165 * WINDOW_MS);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should not close on the first silence window past the minimum duration', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 63);
            const closed = cutWindows(cutter, SILENT, 1);

            expect(closed).toEqual([]);
        });

        it('should close after the silence window count even past the minimum duration', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 63);
            const closed = cutWindows(cutter, SILENT, 3);

            expect(closed.length).toBe(1);
            expect(closed[0].getDurationMs()).toBe(76 * WINDOW_MS);
        });

        it('should drop a segment abandoned by early silence right after opening', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 20);
            const opened = cutWindows(cutter, VOICED, 1);
            const abandoned = cutWindows(cutter, SILENT, 3);

            expect(opened).toEqual([]);
            expect(abandoned).toEqual([]);

            const reopened = cutWindows(cutter, VOICED, 100);
            expect(reopened).toEqual([]);
        });

        it('should hard-cut at exactly the maximum duration while speech continues', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            const spoken = cutWindows(cutter, VOICED, 900);

            expect(spoken.length).toBe(1);
            expect(spoken[0].getDurationMs()).toBe(SpeechCutter.MAX_SEGMENT_DURATION_MS);
            expect(spoken[0].samples.length).toBe(
                (SpeechCutter.MAX_SEGMENT_DURATION_MS / WINDOW_MS) * WINDOW_SAMPLES,
            );
        });

        it('should close the post-hard-cut segment early on sustained silence', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            const forced = cutWindows(cutter, VOICED, 876);
            expect(forced.length).toBe(1);

            const sustainedSilence = cutWindows(cutter, SILENT, 3);
            expect(sustainedSilence).toEqual([]);

            const next = cutWindows(cutter, VOICED, 100);
            expect(next).toEqual([]);
        });

        it('should emit at end of stream when the open segment reached the minimum duration', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 63);

            const segment = cutter.endOfStream();

            expect(segment).not.toBeNull();
            expect(segment?.getDurationMs()).toBe(73 * WINDOW_MS);
        });

        it('should drop the open segment at end of stream below the minimum duration', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 52);

            expect(cutter.endOfStream()).toBeNull();
        });

        it('should start at zero with no pre-roll when speech opens immediately', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, VOICED, 100);
            const closed = cutWindows(cutter, SILENT, 3);

            expect(closed.length).toBe(1);
            expect(closed[0].startMs).toBe(0);
            expect(closed[0].getDurationMs()).toBe(103 * WINDOW_MS);
        });

        it('should emit nothing after reset even mid-segment', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, VOICED, 100);
            cutter.reset();

            expect(cutter.endOfStream()).toBeNull();
            expect(cutWindows(cutter, SILENT, 10)).toEqual([]);
        });
    });

    describe('I - Interface Tests', () => {
        it('should expose segment boundaries in milliseconds on the sample clock', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            const closed = cutWindows(cutter, SILENT, 3);

            const segment = closed[0];
            expect(segment.endMs - segment.startMs).toBe(segment.getDurationMs());
        });
    });

    describe('E - Exception Tests', () => {
        it('should reject a window with a length different from windowSamples', () => {
            const cutter = new SpeechCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            expect(() => cutter.cut(samplesOf(100), VOICED)).toThrow(PipelineException);
        });

        it('should reject a zero window size', () => {
            expect(() => new SpeechCutter(0, SAMPLE_RATE_HZ)).toThrow(PipelineException);
        });

        it('should reject a negative sample rate', () => {
            expect(() => new SpeechCutter(WINDOW_SAMPLES, -16000)).toThrow(PipelineException);
        });
    });
});
