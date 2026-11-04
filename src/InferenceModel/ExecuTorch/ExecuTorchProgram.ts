import type { ExecuTorchParameter } from './ExecuTorchParameter';
import type { ExecuTorchTensor } from './ExecuTorchRuntime';

export type ExecuTorchProgramExecutor = (
    methodName: string,
    inputs: ExecuTorchTensor[],
    outputTensors: ExecuTorchTensor[],
) => unknown;

export type ExecuTorchProgramDisposer = () => void;

/**
 * ExecuTorchProgram – A loaded `.pte` program: its path, the validated output
 * parameters by method name and the JSI entry points it was loaded with. Built
 * by the backend after the native payload has been validated.
 */
export class ExecuTorchProgram {
    public constructor(
        public readonly path: string,
        public readonly schema: ReadonlyMap<string, readonly ExecuTorchParameter[]>,
        private readonly executeProgram: ExecuTorchProgramExecutor,
        private readonly disposeProgram: ExecuTorchProgramDisposer,
    ) {}

    public execute(methodName: string, inputs: ExecuTorchTensor[], outputTensors: ExecuTorchTensor[]): unknown {
        return this.executeProgram(methodName, inputs, outputTensors);
    }

    public dispose(): void {
        this.disposeProgram();
    }
}
