/**
 * VadWindowFramer Tests - ZOMBIE Methodology
 *
 * Z - Zero: empty input, no leftover
 * O - One: exactly one window
 * M - Many: irregular chunk streams
 * B - Boundaries: exact window size, invalid window size
 * I - Interfaces: contract - windows are exact, takeLeftover is destructive
 * E - Exceptions: invalid constructor args
 */

import { PipelineException } from '@/Exception';
import { VadWindowFramer } from '../../src/Pipeline/VadWindowFramer';

const WINDOW_SAMPLES = 512;

function samplesOf(length: number): Float32Array {
    const samples = new Float32Array(length);

    for (let index = 0; index < length; index += 1) {
        samples[index] = (index % 251) / 251;
    }

    return samples;
}

function concat(parts: Float32Array[]): Float32Array {
    let total = 0;
    for (const part of parts) {
        total += part.length;
    }

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

describe('VadWindowFramer - ZOMBIE Tests', () => {
    describe('Z - Zero Tests', () => {
        it('should emit no window when the chunk is smaller than the window size', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);

            expect(framer.frame(samplesOf(100))).toEqual([]);
        });

        it('should emit no window on an empty chunk', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);

            expect(framer.frame(new Float32Array(0))).toEqual([]);
        });

        it('should return an empty leftover when nothing is pending', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);

            expect(framer.takeLeftover().length).toBe(0);
        });
    });

    describe('O - One Tests', () => {
        it('should emit exactly one window for a chunk of exact window size', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);
            const chunk = samplesOf(WINDOW_SAMPLES);

            const windows = framer.frame(chunk);

            expect(windows.length).toBe(1);
            expect(equals(windows[0], chunk)).toBe(true);
            expect(framer.takeLeftover().length).toBe(0);
        });
    });

    describe('M - Many Tests', () => {
        it('should merge multiple windows across irregular chunks with no lost or duplicated sample', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);
            const source = samplesOf(5000);
            const chunkSizes = [100, 1000, 37, 2000, 500, 1363];
            const windows: Float32Array[] = [];
            let offset = 0;

            for (const size of chunkSizes) {
                windows.push(...framer.frame(source.subarray(offset, offset + size)));
                offset += size;
            }

            const leftover = framer.takeLeftover();
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
            const framer = new VadWindowFramer(WINDOW_SAMPLES);
            const first = samplesOf(WINDOW_SAMPLES + 200);

            framer.frame(first);
            framer.takeLeftover();

            const second = samplesOf(WINDOW_SAMPLES);
            const windows = framer.frame(second);

            expect(windows.length).toBe(1);
            expect(equals(windows[0], second)).toBe(true);
        });
    });

    describe('B - Boundary Tests', () => {
        it('should return the exact leftover size', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);

            framer.frame(samplesOf(WINDOW_SAMPLES * 2 + 137));

            const leftover = framer.takeLeftover();

            expect(leftover.length).toBe(137);
        });

        it('should return nothing on a second take (destructive)', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);

            framer.frame(samplesOf(100));
            framer.takeLeftover();

            expect(framer.takeLeftover().length).toBe(0);
        });
    });

    describe('I - Interface Tests', () => {
        it('should emit windows of exactly windowSamples length', () => {
            const framer = new VadWindowFramer(WINDOW_SAMPLES);

            const windows = framer.frame(samplesOf(WINDOW_SAMPLES * 4));

            expect(windows.length).toBe(4);
            expect(windows.every((window) => window.length === WINDOW_SAMPLES)).toBe(true);
        });
    });

    describe('E - Exception Tests', () => {
        it('should reject a zero window size', () => {
            expect(() => new VadWindowFramer(0)).toThrow(PipelineException);
        });

        it('should reject a negative window size', () => {
            expect(() => new VadWindowFramer(-64)).toThrow(PipelineException);
        });
    });
});
