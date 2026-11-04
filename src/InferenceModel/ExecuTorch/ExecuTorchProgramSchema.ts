import { z } from 'zod';
import { ExecuTorchException } from '@/Exception';
import { ExecuTorchDimension, ExecuTorchDimensionKind } from './ExecuTorchDimension';
import { ExecuTorchParameter } from './ExecuTorchParameter';

type RawDimension = z.infer<typeof ExecuTorchProgramSchema.DIMENSION>;
type RawParameter = z.infer<typeof ExecuTorchProgramSchema.PARAMETER>;
type RawMethodMap = z.infer<typeof ExecuTorchProgramSchema.METHODS>;

/**
 * ExecuTorchProgramSchema – Zod boundary for the method schema embedded in a
 * compiled `.pte` program. The native bridge delivers this structure as raw
 * JSON; `parseMethods` validates it and maps it into the domain classes the
 * runtime manipulates. Nothing crosses into the runtime unparsed.
 */
export class ExecuTorchProgramSchema {
    public static readonly DTYPE = z.enum(['float32', 'uint8', 'int32', 'int64', 'bool']);

    public static readonly TAG = z.enum([
        'None',
        'Tensor',
        'Int',
        'Double',
        'Bool',
        'String',
        'ListBool',
        'ListDouble',
        'ListInt',
        'ListTensor',
    ]);

    public static readonly NON_TENSOR_TAG = z.enum([
        'None',
        'Int',
        'Double',
        'Bool',
        'String',
        'ListBool',
        'ListDouble',
        'ListInt',
        'ListTensor',
    ]);

    public static readonly DIMENSION = z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('constant'), value: z.number() }),
        z.object({
            kind: z.literal('range'),
            range: z.object({ min: z.number(), max: z.number(), step: z.number() }),
        }),
        z.object({ kind: z.literal('enum'), choices: z.array(z.number()) }),
    ]);

    public static readonly PARAMETER = z.union([
        z.object({
            kind: z.literal('Tensor'),
            dtype: ExecuTorchProgramSchema.DTYPE,
            shape: z.array(ExecuTorchProgramSchema.DIMENSION),
        }),
        z.object({
            kind: ExecuTorchProgramSchema.NON_TENSOR_TAG,
        }),
    ]);

    public static readonly METHOD = z.object({
        inputs: z.array(ExecuTorchProgramSchema.PARAMETER),
        outputs: z.array(ExecuTorchProgramSchema.PARAMETER),
    });

    public static readonly METHODS = z.record(z.string(), ExecuTorchProgramSchema.METHOD);

    public static parseMethods(raw: unknown): ReadonlyMap<string, readonly ExecuTorchParameter[]> {
        const result = ExecuTorchProgramSchema.METHODS.safeParse(raw);
        if (!result.success) {
            throw new ExecuTorchException(`Invalid ExecuTorch program schema: ${result.error.message}`);
        }

        return ExecuTorchProgramSchema.buildOutputMap(result.data);
    }

    private static buildOutputMap(parsed: RawMethodMap): ReadonlyMap<string, readonly ExecuTorchParameter[]> {
        const entries = Object.entries(parsed).map(([methodName, method]): [string, readonly ExecuTorchParameter[]] => [
            methodName,
            method.outputs.map(ExecuTorchProgramSchema.buildParameter),
        ]);

        return new Map(entries);
    }

    private static buildParameter(raw: RawParameter): ExecuTorchParameter {
        if (raw.kind === 'Tensor') {
            return ExecuTorchParameter.tensor(raw.dtype, raw.shape.map(ExecuTorchProgramSchema.buildDimension));
        }

        return ExecuTorchParameter.scalar(raw.kind);
    }

    private static buildDimension(raw: RawDimension): ExecuTorchDimension {
        switch (raw.kind) {
            case 'constant':
                return ExecuTorchDimension.constant(raw.value);
            case 'range':
                return ExecuTorchDimension.dynamic(ExecuTorchDimensionKind.Range);
            case 'enum':
                return ExecuTorchDimension.dynamic(ExecuTorchDimensionKind.Enum);
        }
    }
}

export type ExecuTorchDType = z.infer<typeof ExecuTorchProgramSchema.DTYPE>;
export type ExecuTorchTag = z.infer<typeof ExecuTorchProgramSchema.TAG>;
export type ExecuTorchNonTensorTag = Exclude<ExecuTorchTag, 'Tensor'>;
