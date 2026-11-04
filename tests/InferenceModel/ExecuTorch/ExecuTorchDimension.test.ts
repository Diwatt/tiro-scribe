import { ExecuTorchDimension, ExecuTorchDimensionKind } from '@/InferenceModel/ExecuTorch';
import { ExecuTorchException } from '@/Exception';

describe('ExecuTorchDimension', () => {
    describe('constant', () => {
        it('builds a dimension of constant kind carrying the value', () => {
            const dimension = ExecuTorchDimension.constant(64);

            expect(dimension.kind).toBe(ExecuTorchDimensionKind.Constant);
            expect(dimension.isConstant()).toBe(true);
            expect(dimension.getConstantValue()).toBe(64);
        });
    });

    describe('dynamic', () => {
        it('builds a range dimension that is not constant', () => {
            const dimension = ExecuTorchDimension.dynamic(ExecuTorchDimensionKind.Range);

            expect(dimension.kind).toBe(ExecuTorchDimensionKind.Range);
            expect(dimension.isConstant()).toBe(false);
        });

        it('builds an enum dimension that is not constant', () => {
            const dimension = ExecuTorchDimension.dynamic(ExecuTorchDimensionKind.Enum);

            expect(dimension.kind).toBe(ExecuTorchDimensionKind.Enum);
            expect(dimension.isConstant()).toBe(false);
        });

        it('refuses to expose a constant value', () => {
            const dimension = ExecuTorchDimension.dynamic(ExecuTorchDimensionKind.Range);

            expect(() => dimension.getConstantValue()).toThrow(ExecuTorchException);
            expect(() => dimension.getConstantValue()).toThrow(/got kind 'range'/i);
        });
    });
});
