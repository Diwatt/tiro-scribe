import { ExecuTorchException } from '@/Exception';

export enum ExecuTorchDimensionKind {
    Constant = 'constant',
    Range = 'range',
    Enum = 'enum',
}

/**
 * ExecuTorchDimension – One dimension of a tensor declared in a `.pte` method
 * schema. Only constant dimensions carry a usable value: dynamic ones (range,
 * enum) are kept for their kind alone, which is all the runtime needs to
 * reject them with a precise message.
 */
export class ExecuTorchDimension {
    private constructor(
        public readonly kind: ExecuTorchDimensionKind,
        private readonly constantValue: number | undefined,
    ) {}

    public static constant(value: number): ExecuTorchDimension {
        return new ExecuTorchDimension(ExecuTorchDimensionKind.Constant, value);
    }

    public static dynamic(kind: Exclude<ExecuTorchDimensionKind, ExecuTorchDimensionKind.Constant>): ExecuTorchDimension {
        return new ExecuTorchDimension(kind, undefined);
    }

    public isConstant(): boolean {
        return this.kind === ExecuTorchDimensionKind.Constant;
    }

    public getConstantValue(): number {
        if (this.constantValue === undefined) {
            throw new ExecuTorchException(
                `Constant value is only defined on dimensions of kind '${ExecuTorchDimensionKind.Constant}' (got kind '${this.kind}')`,
            );
        }

        return this.constantValue;
    }
}
