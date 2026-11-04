import { ExecuTorchException } from '@/Exception';
import type { ExecuTorchDimension } from './ExecuTorchDimension';
import type { ExecuTorchDType, ExecuTorchNonTensorTag, ExecuTorchTag } from './ExecuTorchProgramSchema';

/**
 * ExecuTorchParameter – One input or output declared by a `.pte` method:
 * either a tensor (dtype + shape) or a scalar tag. Scalar parameters keep
 * their tag only, which is all the runtime needs to reject them precisely.
 */
export class ExecuTorchParameter {
    private constructor(
        public readonly kind: ExecuTorchTag,
        private readonly tensorDtype: ExecuTorchDType | undefined,
        private readonly tensorShape: readonly ExecuTorchDimension[] | undefined,
    ) {}

    public static tensor(dtype: ExecuTorchDType, shape: readonly ExecuTorchDimension[]): ExecuTorchParameter {
        return new ExecuTorchParameter('Tensor', dtype, shape);
    }

    public static scalar(kind: ExecuTorchNonTensorTag): ExecuTorchParameter {
        return new ExecuTorchParameter(kind, undefined, undefined);
    }

    public isTensor(): boolean {
        return this.tensorShape !== undefined;
    }

    public getDtype(): ExecuTorchDType {
        if (this.tensorDtype === undefined) {
            throw new ExecuTorchException(`Parameter of kind '${this.kind}' is not a tensor: dtype is only defined on tensor parameters`);
        }

        return this.tensorDtype;
    }

    public getShape(): readonly ExecuTorchDimension[] {
        if (this.tensorShape === undefined) {
            throw new ExecuTorchException(`Parameter of kind '${this.kind}' is not a tensor: shape is only defined on tensor parameters`);
        }

        return this.tensorShape;
    }
}
