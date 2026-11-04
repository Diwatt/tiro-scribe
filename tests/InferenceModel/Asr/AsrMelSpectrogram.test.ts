import fs from 'node:fs';
import path from 'node:path';

import { AsrMelSpectrogram } from '@/InferenceModel/Asr/AsrMelSpectrogram';

const FIXTURES = path.join(__dirname, 'fixtures');
const GOLDEN = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'asr_mel_golden.json'), 'utf-8')) as {
    signalLcg: { a: number; m: number; seed: number; count: number };
    frames: number[];
    featuresLength: number;
    melRaw: Record<string, number[]>;
    melNormalized: Record<string, number[]>;
};

const FILTERS = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'asr_mel_filters.json'), 'utf-8')) as {
    rows: number;
    cols: number;
    data: number[][];
};

/** Same LCG Lehmer generator as the Python fixture tooling (exact in float64: a*m < 2^53). */
const generateSignal = (seed: number, count: number, modulus: number, multiplier: number): Float32Array => {
    const samples = new Float32Array(count);
    let state = seed;
    for (let index = 0; index < count; index += 1) {
        state = (state * multiplier) % modulus;
        samples[index] = (state / (modulus - 1)) * 2 - 1;
    }
    return samples;
};

const createMelSpectrogram = (): AsrMelSpectrogram => AsrMelSpectrogram.create(FILTERS.data);

const assertClose = (actual: number[], expected: number[], tolerance: number): void => {
    expect(actual).toHaveLength(expected.length);
    let maxDiff = 0;
    for (let index = 0; index < expected.length; index += 1) {
        maxDiff = Math.max(maxDiff, Math.abs(actual[index] - expected[index]));
    }
    expect(maxDiff).toBeLessThan(tolerance);
};

describe('AsrMelSpectrogram', () => {
    it('produces the golden raw log-mel frames from the shared LCG signal', () => {
        const spectrogram = createMelSpectrogram();
        const signal = generateSignal(
            GOLDEN.signalLcg.seed,
            GOLDEN.signalLcg.count,
            GOLDEN.signalLcg.m,
            GOLDEN.signalLcg.a,
        );
        const frameCount = Math.floor(signal.length / AsrMelSpectrogram.HOP_LENGTH) + 1;

        const raw = spectrogram.computeRaw(signal);

        expect(frameCount).toBe(101);
        expect(GOLDEN.featuresLength).toBe(frameCount - 1);
        for (const frame of GOLDEN.frames) {
            assertClose(
                Array.from(raw.slice(frame * FILTERS.rows, (frame + 1) * FILTERS.rows)),
                GOLDEN.melRaw[String(frame)],
                5e-3,
            );
        }
    });

    it('normalizes per mel bin over valid frames and zero-pads the rest', () => {
        const spectrogram = createMelSpectrogram();
        const signal = generateSignal(
            GOLDEN.signalLcg.seed,
            GOLDEN.signalLcg.count,
            GOLDEN.signalLcg.m,
            GOLDEN.signalLcg.a,
        );

        const result = spectrogram.compute(signal);

        expect(result).toHaveLength(101 * FILTERS.rows);
        for (const frame of GOLDEN.frames) {
            assertClose(
                Array.from(result.slice(frame * FILTERS.rows, (frame + 1) * FILTERS.rows)),
                GOLDEN.melNormalized[String(frame)],
                5e-3,
            );
        }
        const paddedFrame = result.slice(100 * FILTERS.rows, 101 * FILTERS.rows);
        expect(Array.from(paddedFrame).every((value) => value === 0)).toBe(true);
    });

    it('rejects mel filters whose mel bin count does not match the frozen pipeline', () => {
        const wrongMelCount = FILTERS.data.slice(0, 80);
        expect(() => AsrMelSpectrogram.create(wrongMelCount)).toThrow(/mel filters/i);
    });

    it('rejects mel filters whose frequency bin count does not match the frozen FFT', () => {
        const wrongBinCount = FILTERS.data.map((row) => row.slice(0, 256));
        expect(() => AsrMelSpectrogram.create(wrongBinCount)).toThrow(/mel filters/i);
    });

    it('rejects ragged mel filters', () => {
        const ragged = FILTERS.data.map((row, index) => (index === 0 ? row.slice(0, row.length - 1) : row));
        expect(() => AsrMelSpectrogram.create(ragged)).toThrow(/mel filters/i);
    });
});
