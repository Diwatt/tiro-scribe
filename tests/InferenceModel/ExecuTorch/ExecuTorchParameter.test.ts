import { ExecuTorchDimension, ExecuTorchParameter } from '@/InferenceModel/ExecuTorch';
import { ExecuTorchException } from '@/Exception';

const constantShape = (): ExecuTorchDimension[] => [ExecuTorchDimension.constant(1), ExecuTorchDimension.constant(2)];

describe('ExecuTorchParameter', () => {
    describe('tensor', () => {
        it('builds a tensor parameter exposing dtype and shape', () => {
            const parameter = ExecuTorchParameter.tensor('float32', constantShape());

            expect(parameter.kind).toBe('Tensor');
            expect(parameter.isTensor()).toBe(true);
            expect(parameter.getDtype()).toBe('float32');
            expect(parameter.getShape()).toEqual(constantShape());
        });
    });

    describe('scalar', () => {
        it('builds a scalar parameter carrying only its tag', () => {
            const parameter = ExecuTorchParameter.scalar('Int');

            expect(parameter.kind).toBe('Int');
            expect(parameter.isTensor()).toBe(false);
        });

        it('refuses to expose a dtype', () => {
            const parameter = ExecuTorchParameter.scalar('Int');

            expect(() => parameter.getDtype()).toThrow(ExecuTorchException);
            expect(() => parameter.getDtype()).toThrow(/not a tensor/i);
        });

        it('refuses to expose a shape', () => {
            const parameter = ExecuTorchParameter.scalar('Int');

            expect(() => parameter.getShape()).toThrow(ExecuTorchException);
            expect(() => parameter.getShape()).toThrow(/not a tensor/i);
        });
    });
});
