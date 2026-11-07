/**
 * AsrRunInput Tests - ZOMBIE Methodology
 *
 * Z - Zero: no samples, no segments rejected at creation
 * O - One: single segment mapping
 * M - Many: segments chained across trimmed gaps
 * B - Boundaries: offsets at segment edges, clamping outside stored audio
 * I - Interfaces: absoluteMsAt / segmentIndexAt contract
 * E - Exceptions: inconsistent segments, empty input, unaccounted samples
 */

import { PipelineException } from '@/Exception';
import { AsrRunInput } from '../../src/Pipeline/AsrRunInput';
import { AudioSegment } from '../../src/Pipeline/AudioSegment';

const SAMPLE_RATE_HZ = 16000;
const SEGMENT_A_SAMPLES = 1600;
const SEGMENT_B_SAMPLES = 800;

const makeSegments = (): AudioSegment[] => [
    AudioSegment.create(1000, 1100, 0, SEGMENT_A_SAMPLES, 16000),
    AudioSegment.create(2000, 2050, SEGMENT_A_SAMPLES, SEGMENT_B_SAMPLES, 32000),
];

const makeSamples = (nbSamples: number): Float32Array => new Float32Array(nbSamples);

const makeRunInput = (): AsrRunInput =>
    AsrRunInput.create(
        SAMPLE_RATE_HZ,
        1000,
        2050,
        makeSegments(),
        makeSamples(SEGMENT_A_SAMPLES + SEGMENT_B_SAMPLES),
    );

describe('AsrRunInput - ZOMBIE Tests', () => {
    describe('Z - Zero Tests', () => {
        it('should expose stored samples and segments unchanged', () => {
            const input = makeRunInput();

            expect(input.getSamples().length).toBe(SEGMENT_A_SAMPLES + SEGMENT_B_SAMPLES);
            expect(input.getSegments()).toHaveLength(2);
            expect(input.startMs).toBe(1000);
            expect(input.endMs).toBe(2050);
        });
    });

    describe('O - One Tests', () => {
        it('should map an offset inside the first segment to its absolute time', () => {
            const input = makeRunInput();

            expect(input.absoluteMsAt(0)).toBe(1000);
            expect(input.absoluteMsAt(50)).toBe(1050);
        });
    });

    describe('M - Many Tests', () => {
        it('should map an offset inside the second segment across the trimmed gap', () => {
            const input = makeRunInput();

            expect(input.absoluteMsAt(120)).toBe(2020);
        });

        it('should route times to their holding segment in stream order', () => {
            const input = makeRunInput();

            expect(input.segmentIndexAt(1000)).toBe(0);
            expect(input.segmentIndexAt(1050)).toBe(0);
            expect(input.segmentIndexAt(1500)).toBe(1);
            expect(input.segmentIndexAt(2020)).toBe(1);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should clamp offsets outside the stored audio to the segment bounds', () => {
            const input = makeRunInput();

            expect(input.absoluteMsAt(-1)).toBe(1000);
            expect(input.absoluteMsAt(100000)).toBe(2050);
        });

        it('should clamp unknown times to the outermost segments', () => {
            const input = makeRunInput();

            expect(input.segmentIndexAt(0)).toBe(0);
            expect(input.segmentIndexAt(100000)).toBe(1);
            expect(input.segmentIndexAt(2100)).toBe(1);
        });
    });

    describe('E - Exception Tests', () => {
        it('should reject segments that do not tile the stored samples contiguously', () => {
            const segments = [AudioSegment.create(1000, 1100, 1, SEGMENT_A_SAMPLES, 16000)];

            expect(() => AsrRunInput.create(SAMPLE_RATE_HZ, 0, 100, segments, makeSamples(SEGMENT_A_SAMPLES))).toThrow(
                PipelineException,
            );
        });

        it('should reject an input without segments', () => {
            expect(() => AsrRunInput.create(SAMPLE_RATE_HZ, 0, 100, [], makeSamples(2400))).toThrow(PipelineException);
        });

        it('should reject an input whose segments do not account for every sample', () => {
            expect(() =>
                AsrRunInput.create(
                    SAMPLE_RATE_HZ,
                    0,
                    100,
                    makeSegments(),
                    makeSamples(SEGMENT_A_SAMPLES + SEGMENT_B_SAMPLES + 1),
                ),
            ).toThrow(PipelineException);
        });
    });
});
