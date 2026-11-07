/**
 * AudioCutter Tests - ZOMBIE Methodology
 *
 * Z - Zero: silence only, no voice at all
 * O - One: a single VAD segment inside one run input
 * M - Many: successive segments grouped together, gaps trimmed, continuity
 * B - Boundaries: min/max duration edges, run input sample cap, pre-roll edges
 * I - Interfaces: contract - cut one VAD window at a time, absolute clock
 * E - Exceptions: wrong window size, invalid constructor args
 */

import { PipelineException } from '@/Exception';
import { AudioCutter } from '../../src/Pipeline/AudioCutter';
import { AsrRunInput } from '../../src/Pipeline/AsrRunInput';
import { AsrRunInputBuilder } from '../../src/Pipeline/AsrRunInputBuilder';

const WINDOW_SAMPLES = 512;
const SAMPLE_RATE_HZ = 16000;
const WINDOW_MS = 32;
const VOICED = 0.9;
const SILENT = 0.1;
const MAX_INPUT_SAMPLES = (AsrRunInputBuilder.MAX_DURATION_MS * SAMPLE_RATE_HZ) / 1000;

const samplesOf = (): Float32Array => new Float32Array(WINDOW_SAMPLES);

const makeCutter = (): AudioCutter =>
    new AudioCutter(WINDOW_SAMPLES, SAMPLE_RATE_HZ, new AsrRunInputBuilder(WINDOW_SAMPLES, SAMPLE_RATE_HZ));

const cutWindows = (cutter: AudioCutter, speechProbability: number, nbWindows: number): AsrRunInput[] => {
    const emitted: AsrRunInput[] = [];

    for (let index = 0; index < nbWindows; index += 1) {
        const input = cutter.cut(samplesOf(), speechProbability);
        if (input !== null) {
            emitted.push(input);
        }
    }

    return emitted;
};

describe('AudioCutter - ZOMBIE Tests', () => {
    describe('Z - Zero Tests', () => {
        it('should emit nothing when the stream stays silent', () => {
            const cutter = makeCutter();

            const inputs = cutWindows(cutter, SILENT, 100);

            expect(inputs).toEqual([]);
            expect(cutter.endOfStream()).toBeNull();
        });

        it('should not emit anything on the opening voiced window', () => {
            const cutter = makeCutter();

            expect(cutter.cut(samplesOf(), VOICED)).toBeNull();
        });

        it('should emit nothing at end of stream while waiting for voice', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 10);

            expect(cutter.endOfStream()).toBeNull();
        });
    });

    describe('O - One Tests', () => {
        it('should emit one segment with pre-roll, voice and trailing silence at end of stream', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            cutWindows(cutter, SILENT, 3);

            expect(cutter.cut(samplesOf(), SILENT)).toBeNull();

            const input = cutter.endOfStream();
            expect(input).not.toBeNull();
            expect(input?.startMs).toBe(50 * WINDOW_MS);
            expect(input?.endMs).toBe(163 * WINDOW_MS);
            expect(input?.getSegments()).toHaveLength(1);
            expect(input?.getSegments()[0].startMs).toBe(50 * WINDOW_MS);
            expect(input?.getSegments()[0].endMs).toBe(163 * WINDOW_MS);
            expect(input?.getSegments()[0].getDurationMs()).toBe(113 * WINDOW_MS);
            expect(input?.getSamples().length).toBe(113 * WINDOW_SAMPLES);
        });
    });

    describe('M - Many Tests', () => {
        it('should group successive segments into one run while trimming the silence gap', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            cutWindows(cutter, SILENT, 3);
            cutWindows(cutter, SILENT, 20);
            cutWindows(cutter, VOICED, 80);
            cutWindows(cutter, SILENT, 3);

            const input = cutter.endOfStream();
            expect(input).not.toBeNull();
            expect(input?.getSegments()).toHaveLength(2);
            expect(input?.getSegments()[0].startMs).toBe(50 * WINDOW_MS);
            expect(input?.getSegments()[0].endMs).toBe(163 * WINDOW_MS);
            expect(input?.getSegments()[1].startMs).toBe(173 * WINDOW_MS);
            expect(input?.getSegments()[1].endMs).toBe(266 * WINDOW_MS);
            expect(input?.getSamples().length).toBe(206 * WINDOW_SAMPLES);
            expect((input?.endMs ?? 0) - (input?.startMs ?? 0)).toBeGreaterThan(
                ((input?.getSamples().length ?? 0) / SAMPLE_RATE_HZ) * 1000,
            );
        });

        it('should keep one segment across a brief pause shorter than the silence window count', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            cutWindows(cutter, SILENT, 2);
            cutWindows(cutter, VOICED, 50);
            cutWindows(cutter, SILENT, 3);

            const input = cutter.endOfStream();
            expect(input).not.toBeNull();
            expect(input?.getSegments()).toHaveLength(1);
            expect(input?.getSegments()[0].getDurationMs()).toBe(165 * WINDOW_MS);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should not close a segment on the first silence window past the minimum duration', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 63);
            const inputs = cutWindows(cutter, SILENT, 1);

            expect(inputs).toEqual([]);
            expect(cutter.endOfStream()?.getSegments()).toHaveLength(1);
        });

        it('should drop a segment abandoned by early silence right after opening', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 20);
            cutWindows(cutter, VOICED, 1);
            cutWindows(cutter, SILENT, 3);
            cutWindows(cutter, SILENT, 100);
            cutWindows(cutter, VOICED, 100);
            cutWindows(cutter, SILENT, 3);

            const input = cutter.endOfStream();
            expect(input).not.toBeNull();
            expect(input?.getSegments()).toHaveLength(1);
            expect(input?.getSegments()[0].startMs).toBe(114 * WINDOW_MS);
            expect(input?.getSegments()[0].endMs).toBe(227 * WINDOW_MS);
            expect(input?.getSamples().length).toBe(113 * WINDOW_SAMPLES);
        });

        it('should emit a full run input exactly at the sample cap while voice continues', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            const inputs = cutWindows(cutter, VOICED, 900);

            expect(inputs).toHaveLength(1);
            expect(inputs[0].getSegments()).toHaveLength(1);
            expect(inputs[0].getSegments()[0].getDurationMs()).toBe(AudioCutter.MAX_SEGMENT_DURATION_MS);
            expect(inputs[0].getSamples().length).toBe(MAX_INPUT_SAMPLES);
            expect(inputs[0].getSamples().length).toBeLessThanOrEqual(MAX_INPUT_SAMPLES);
            expect(inputs[0].startMs).toBe(50 * WINDOW_MS);
            expect(inputs[0].endMs).toBe(925 * WINDOW_MS);
            expect(cutter.endOfStream()).toBeNull();
        });

        it('should resume the next segment exactly where the emitted run input stopped', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            const inputs = cutWindows(cutter, VOICED, 940);

            expect(inputs).toHaveLength(1);

            const input = cutter.endOfStream();
            expect(input).not.toBeNull();
            expect(input?.startMs).toBe(inputs[0].endMs);
            expect(input?.getSegments()[0].getDurationMs()).toBeGreaterThanOrEqual(AudioCutter.MIN_SEGMENT_DURATION_MS);
        });

        it('should emit at end of stream when the open segment reached the minimum duration', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 63);

            const input = cutter.endOfStream();

            expect(input).not.toBeNull();
            expect(input?.getSegments()[0].getDurationMs()).toBe(73 * WINDOW_MS);
        });

        it('should drop the open segment at end of stream below the minimum duration', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 52);

            expect(cutter.endOfStream()).toBeNull();
        });

        it('should start at zero with no pre-roll when voice opens immediately', () => {
            const cutter = makeCutter();

            cutWindows(cutter, VOICED, 100);
            cutWindows(cutter, SILENT, 3);

            const input = cutter.endOfStream();
            expect(input?.startMs).toBe(0);
            expect(input?.getSegments()[0].startMs).toBe(0);
            expect(input?.getSegments()[0].getDurationMs()).toBe(103 * WINDOW_MS);
        });

        it('should never store more samples than the frozen ASR window across many segments', () => {
            const cutter = makeCutter();

            const inputs: AsrRunInput[] = [];
            for (let cycle = 0; cycle < 20; cycle += 1) {
                inputs.push(...cutWindows(cutter, SILENT, 60));
                inputs.push(...cutWindows(cutter, VOICED, 100));
                inputs.push(...cutWindows(cutter, SILENT, 3));
                inputs.push(...cutWindows(cutter, SILENT, 10));
            }
            const finalInput = cutter.endOfStream();
            if (finalInput !== null) {
                inputs.push(finalInput);
            }

            expect(inputs.length).toBeGreaterThan(1);
            for (const input of inputs) {
                expect(input.getSamples().length).toBeLessThanOrEqual(MAX_INPUT_SAMPLES);
            }
            let totalSegments = 0;
            for (const input of inputs) {
                totalSegments += input.getSegments().length;
            }
            expect(totalSegments).toBe(20);
        });

        it('should emit nothing after reset even mid-segment', () => {
            const cutter = makeCutter();

            cutWindows(cutter, VOICED, 100);
            cutter.reset();

            expect(cutter.endOfStream()).toBeNull();
            expect(cutWindows(cutter, SILENT, 10)).toEqual([]);
        });
    });

    describe('I - Interface Tests', () => {
        it('should expose segment boundaries in milliseconds on the absolute sample clock', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            cutWindows(cutter, SILENT, 20);
            cutWindows(cutter, VOICED, 80);
            cutWindows(cutter, SILENT, 3);

            const input = cutter.endOfStream();
            expect(input).not.toBeNull();
            const segments = input?.getSegments() ?? [];
            expect(segments.length).toBe(2);
            expect(segments[0].endMs).toBeLessThanOrEqual(segments[1].startMs);
            expect(input?.startMs).toBe(segments[0].startMs);
            expect(input?.endMs).toBe(segments[segments.length - 1].endMs);
        });

        it('should map an input offset inside the trimmed gap to the following segment', () => {
            const cutter = makeCutter();

            cutWindows(cutter, SILENT, 60);
            cutWindows(cutter, VOICED, 100);
            cutWindows(cutter, SILENT, 3);
            cutWindows(cutter, SILENT, 20);
            cutWindows(cutter, VOICED, 80);
            cutWindows(cutter, SILENT, 3);

            const input = cutter.endOfStream();
            expect(input).not.toBeNull();
            const gapOffsetMs = 113 * WINDOW_MS;
            expect(input?.absoluteMsAt(gapOffsetMs)).toBe(173 * WINDOW_MS);
            expect(input?.segmentIndexAt(input?.absoluteMsAt(gapOffsetMs) ?? 0)).toBe(1);
            expect(input?.absoluteMsAt(0)).toBe(input?.getSegments()[0].startMs);
        });
    });

    describe('E - Exception Tests', () => {
        it('should reject a window with a length different from windowSamples', () => {
            const cutter = makeCutter();

            expect(() => cutter.cut(samplesOf().subarray(0, 100), VOICED)).toThrow(PipelineException);
        });

        it('should reject a zero window size', () => {
            const builder = new AsrRunInputBuilder(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            expect(() => new AudioCutter(0, SAMPLE_RATE_HZ, builder)).toThrow(PipelineException);
        });

        it('should reject a negative sample rate', () => {
            const builder = new AsrRunInputBuilder(WINDOW_SAMPLES, SAMPLE_RATE_HZ);

            expect(() => new AudioCutter(WINDOW_SAMPLES, -16000, builder)).toThrow(PipelineException);
        });
    });
});
