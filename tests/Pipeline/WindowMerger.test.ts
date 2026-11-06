/**
 * WindowMerger Tests - ZOMBIE Methodology
 *
 * Z - Zero: empty input, no leftover
 * O - One: exactly one window
 * M - Many: irregular chunk streams
 * B - Boundaries: exact window size, invalid window size
 * I - Interfaces: contract - windows are exact, takeLeftover is destructive
 * E - Exceptions: invalid constructor args
 */

import { PipelineException } from '@/Exception';
import { WindowMerger } from '../../src/Pipeline/WindowMerger';

const WINDOW_SAMPLES = 512;

function samplesOf(length: number): Float32Array {
    const samples = new Float32Array(length);

    for (let index = 0; index < length; index += 1) {
        samples[index] = (index % 251) / 251;
    }

    return samples;
}

function concat(parts: Float32Array[]): Float32Array {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;

    for (const part of parts) {
        merged.set(part, offset);
        offset += part.length;
    }

    return merged;
}

function equals(left: Float32Array, right: Float32Array): boolean {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((value, index) => value === right[index]);
}

describe('WindowMerger - ZOMBIE Tests', () => {
    describe('Z - Zero Tests', () => {
        it('should emit no window when the chunk is smaller than the window size', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);

            expect(merger.frame(samplesOf(100))).toEqual([]);
        });

        it('should emit no window on an empty chunk', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);

            expect(merger.frame(new Float32Array(0))).toEqual([]);
        });

        it('should return an empty leftover when nothing is pending', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);

            expect(merger.takeLeftover().length).toBe(0);
        });
    });

    describe('O - One Tests', () => {
        it('should emit exactly one window for a chunk of exact window size', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);
            const chunk = samplesOf(WINDOW_SAMPLES);

            const windows = merger.frame(chunk);

            expect(windows.length).toBe(1);
            expect(equals(windows[0], chunk)).toBe(true);
            expect(merger.takeLeftover().length).toBe(0);
        });
    });

    describe('M - Many Tests', () => {
        it('should merge multiple windows across irregular chunks with no lost or duplicated sample', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);
            const source = samplesOf(5000);
            const chunkSizes = [100, 1000, 37, 2000, 500, 1363];
            const windows: Float32Array[] = [];
            let offset = 0;

            for (const size of chunkSizes) {
                windows.push(...merger.frame(source.subarray(offset, offset + size)));
                offset += size;
            }

            const leftover = merger.takeLeftover();
            windows.push(leftover);

            expect(offset).toBe(5000);
            expect(
                windows.every(
                    (window) => window.length === WINDOW_SAMPLES || window === leftover,
                ),
            ).toBe(true);
            expect(equals(concat(windows), source)).toBe(true);
        });

        it('should keep accepting chunks after taking the leftover without contamination', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);
            const first = samplesOf(WINDOW_SAMPLES + 200);

            merger.frame(first);
            merger.takeLeftover();

            const second = samplesOf(WINDOW_SAMPLES);
            const windows = merger.frame(second);

            expect(windows.length).toBe(1);
            expect(equals(windows[0], second)).toBe(true);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should return the exact leftover size', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);

            merger.frame(samplesOf(WINDOW_SAMPLES * 2 + 137));

            const leftover = merger.takeLeftover();

            expect(leftover.length).toBe(137);
        });

        it('should return nothing on a second take (destructive)', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);

            merger.frame(samplesOf(100));
            merger.takeLeftover();

            expect(merger.takeLeftover().length).toBe(0);
        });
    });

    describe('I - Interface Tests', () => {
        it('should emit windows of exactly windowSamples length', () => {
            const merger = new WindowMerger(WINDOW_SAMPLES);

            const windows = merger.frame(samplesOf(WINDOW_SAMPLES * 4));

            expect(windows.length).toBe(4);
            expect(windows.every((window) => window.length === WINDOW_SAMPLES)).toBe(true);
        });
    });

    describe('E - Exception Tests', () => {
        it('should reject a zero window size', () => {
            expect(() => new WindowMerger(0)).toThrow(PipelineException);
        });

        it('should reject a negative window size', () => {
            expect(() => new WindowMerger(-64)).toThrow(PipelineException);
        });
    });
});
