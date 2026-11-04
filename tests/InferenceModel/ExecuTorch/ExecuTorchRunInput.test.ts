import { ExecuTorchRunInput } from '@/InferenceModel/ExecuTorch/ExecuTorchRunInput';
import { ExecuTorchException } from '@/Exception';

describe('ExecuTorchRunInput', () => {
    describe('create', () => {
        it('builds an input whose data and shape are exposed read-only', () => {
            const data = new Float32Array([1, 2, 3, 4]);

            const input = ExecuTorchRunInput.create(data, [2, 2]);

            expect(input.data).toBe(data);
            expect(input.shape).toEqual([2, 2]);
        });

        it('accepts int64 data', () => {
            const data = BigInt64Array.from([BigInt(7)]);

            const input = ExecuTorchRunInput.create(data, [1, 1]);

            expect(input.data).toBe(data);
            expect(input.shape).toEqual([1, 1]);
        });

        it('rejects data whose length does not match the declared shape', () => {
            const data = new Float32Array([1, 2, 3]);

            expect(() => ExecuTorchRunInput.create(data, [2, 2])).toThrow(ExecuTorchException);
            expect(() => ExecuTorchRunInput.create(data, [2, 2])).toThrow(/holds 3 elements but shape \[2,2\] declares 4/i);
        });

        it('rejects a shape declaring more elements than the data holds', () => {
            const data = new Float32Array([1]);

            expect(() => ExecuTorchRunInput.create(data, [1, 2, 3])).toThrow(ExecuTorchException);
        });
    });
});
