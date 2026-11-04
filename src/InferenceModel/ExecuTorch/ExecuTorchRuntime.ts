import { ExecuTorchException } from '@/Exception';
import type { ExecuTorchDimension } from './ExecuTorchDimension';
import type { ExecuTorchParameter } from './ExecuTorchParameter';
import type { ExecuTorchProgram } from './ExecuTorchProgram';
import type { ExecuTorchDType } from './ExecuTorchProgramSchema';
import type { ExecuTorchRunInput } from './ExecuTorchRunInput';

export interface ExecuTorchTensor {
    readonly shape: readonly number[];
    getData(destination: Float32Array | BigInt64Array): Float32Array | BigInt64Array;
    dispose(): void;
}

export interface ExecuTorchBackend {
    loadProgram(path: string): Promise<ExecuTorchProgram>;
    createTensor(
        dtype: ExecuTorchDType,
        shape: readonly number[],
        source?: Float32Array | BigInt64Array,
    ): ExecuTorchTensor;
}

/**
 * Adapter over the react-native-executorch JSI surface: loads compiled .pte
 * programs and executes named methods with pre-allocated outputs derived from
 * the exported schema. The native loader only accepts bare filesystem paths,
 * so file:// URIs are stripped on load. Execution is synchronous, matching the
 * native contract; loading stays async.
 */
export class ExecuTorchRuntime {
    public constructor(private readonly backend: ExecuTorchBackend) {}

    public async load(modelUri: string): Promise<ExecuTorchProgram> {
        return this.backend.loadProgram(this.toModelPath(modelUri));
    }

    public run(
        program: ExecuTorchProgram,
        inputs: readonly ExecuTorchRunInput[],
        methodName = 'forward',
    ): readonly Float32Array[] {
        const outputs = program.schema.get(methodName);
        if (outputs == null) {
            throw new ExecuTorchException(`ExecuTorch program '${program.path}' declares no method '${methodName}'`);
        }

        const outputTensors = outputs.map((parameter) => this.allocateOutputTensor(parameter));
        const inputTensors = inputs.map((input) =>
            this.backend.createTensor(
                input.data instanceof BigInt64Array ? 'int64' : 'float32',
                input.shape,
                input.data,
            ),
        );
        try {
            program.execute(methodName, inputTensors, outputTensors);

            return outputTensors.map((tensor) => this.readTensor(tensor));
        } finally {
            for (const tensor of inputTensors) {
                tensor.dispose();
            }
            for (const tensor of outputTensors) {
                tensor.dispose();
            }
        }
    }

    private toModelPath(modelUri: string): string {
        return modelUri.startsWith('file://') ? modelUri.slice('file://'.length) : modelUri;
    }

    private allocateOutputTensor(parameter: ExecuTorchParameter): ExecuTorchTensor {
        if (!parameter.isTensor()) {
            throw new ExecuTorchException(
                `ExecuTorch programs with non-tensor outputs are not supported (got kind '${parameter.kind}')`,
            );
        }

        const shape = parameter.getShape().map((dimension: ExecuTorchDimension) => {
            if (!dimension.isConstant()) {
                throw new ExecuTorchException(
                    `ExecuTorch outputs must declare constant dimensions (got kind '${dimension.kind}')`,
                );
            }
            return dimension.getConstantValue();
        });

        return this.backend.createTensor(parameter.getDtype(), shape);
    }

    private readTensor(tensor: ExecuTorchTensor): Float32Array {
        const elements = tensor.shape.reduce((product, size) => product * size, 1);
        const destination = new Float32Array(elements);
        tensor.getData(destination);

        return destination;
    }
}
