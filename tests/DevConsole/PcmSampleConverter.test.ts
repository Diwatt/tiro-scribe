jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

import { PcmSampleConverter } from '@/Math';

describe('PcmSampleConverter', () => {
    let converter: PcmSampleConverter;

    beforeEach(() => {
        converter = new PcmSampleConverter();
    });

    describe('int16ToFloat32', () => {
        it('normalizes int16 samples to the [-1, 1] float range', () => {
            const pcm = converter.int16ToFloat32(Int16Array.from([0, 16384, -16384, 32767, -32768]));

            expect(Array.from(pcm)).toEqual([0, 0.5, -0.5, 32767 / 32768, -1]);
        });
    });

    describe('stereoToMono', () => {
        it('averages each left/right pair into a single sample', () => {
            const mono = converter.stereoToMono(Int16Array.from([16384, 0, -16384, 16384]));

            expect(Array.from(mono)).toEqual([0.25, 0]);
        });
    });

    describe('float32ToInt16', () => {
        it('scales float samples back to the int16 range', () => {
            const pcm = converter.float32ToInt16(Float32Array.from([0, 0.5, -0.5]));

            expect(Array.from(pcm)).toEqual([0, 16384, -16384]);
        });

        it('clamps samples beyond the int16 range', () => {
            const pcm = converter.float32ToInt16(Float32Array.from([2, -2]));

            expect(Array.from(pcm)).toEqual([32767, -32768]);
        });

        it('round-trips a signal through float32 without drift on integer levels', () => {
            const original = Int16Array.from([-32768, -16384, 0, 16384, 32767]);
            const roundTripped = converter.float32ToInt16(converter.int16ToFloat32(original));

            expect(Array.from(roundTripped)).toEqual(Array.from(original));
        });
    });
});
