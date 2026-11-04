import { type DType, loadModel, tensor } from 'react-native-executorch';
import { ExecuTorchException } from '@/Exception';
import type { ExecuTorchParameter } from './ExecuTorchParameter';
import { ExecuTorchProgram } from './ExecuTorchProgram';
import type { ExecuTorchDType } from './ExecuTorchProgramSchema';
import { ExecuTorchProgramSchema } from './ExecuTorchProgramSchema';
import type { ExecuTorchBackend, ExecuTorchTensor } from './ExecuTorchRuntime';

/**
 * Real backend over the react-native-executorch native module. The native
 * payload is untrusted: its method schema is validated through the Zod
 * boundary and mapped to the domain classes (ExecuTorchProgramSchema), and the
 * JSI functions are probed before a program is handed out. The program's path
 * comes from the JS side, the single source of truth for what was loaded.
 */
export class ReactNativeExecuTorchBackend implements ExecuTorchBackend {
    // TODO(P6): dispatch through wrapAsync on a worklet runtime once RTF is measured on device
    public async loadProgram(path: string): Promise<ExecuTorchProgram> {
        const native = (await loadModel(path)) as unknown as {
            schema?: unknown;
            execute?: unknown;
            dispose?: unknown;
        };

        if (typeof native.execute !== 'function' || typeof native.dispose !== 'function') {
            throw new ExecuTorchException(`ExecuTorch program at '${path}' does not expose execute/dispose native methods`);
        }

        const { execute, dispose } = native as {
            execute: ExecuTorchProgram['execute'];
            dispose: ExecuTorchProgram['dispose'];
        };

        return new ExecuTorchProgram(path, this.parseSchema(native.schema, path), execute, dispose);
    }

    public createTensor(dtype: ExecuTorchDType, shape: readonly number[], source?: Float32Array | BigInt64Array): ExecuTorchTensor {
        return tensor(dtype as DType, [...shape], source);
    }

    private parseSchema(raw: unknown, path: string): ReadonlyMap<string, readonly ExecuTorchParameter[]> {
        try {
            return ExecuTorchProgramSchema.parseMethods(raw);
        } catch (error) {
            throw new ExecuTorchException(
                `ExecuTorch program at '${path}' declares an invalid method schema`,
                error instanceof Error ? error : undefined,
            );
        }
    }
}
