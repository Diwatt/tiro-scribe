import { PipelineTimings } from '../../src/Pipeline/PipelineTimings';

describe('PipelineTimings', () => {
    it('should return zero timings on a fresh accumulator', () => {
        const timings = new PipelineTimings();

        expect(timings.getDecryptMs()).toBe(0);
        expect(timings.getConvertMs()).toBe(0);
        expect(timings.getVadMs()).toBe(0);
        expect(timings.getCutMs()).toBe(0);
        expect(timings.getAsrMs()).toBe(0);
        expect(timings.getTotalMs()).toBe(0);
    });

    it('should accumulate each phase across multiple adds', () => {
        const timings = new PipelineTimings();

        timings.addDecrypt(10);
        timings.addDecrypt(5);
        timings.addConvert(3);
        timings.addVad(200);
        timings.addVad(50);
        timings.addCut(1);
        timings.addAsr(1500);
        timings.addAsr(700);

        expect(timings.getDecryptMs()).toBe(15);
        expect(timings.getConvertMs()).toBe(3);
        expect(timings.getVadMs()).toBe(250);
        expect(timings.getCutMs()).toBe(1);
        expect(timings.getAsrMs()).toBe(2200);
    });

    it('should exclude decrypt from the measured phases sum', () => {
        const timings = new PipelineTimings();

        timings.addDecrypt(100);
        timings.addConvert(3);
        timings.addVad(250);
        timings.addCut(1);
        timings.addAsr(2200);

        expect(timings.getPhasesMs()).toBe(2454);
    });

    it('should sum every phase in the total', () => {
        const timings = new PipelineTimings();

        timings.addDecrypt(15);
        timings.addConvert(3);
        timings.addVad(250);
        timings.addCut(1);
        timings.addAsr(2200);

        expect(timings.getTotalMs()).toBe(2469);
    });
});
