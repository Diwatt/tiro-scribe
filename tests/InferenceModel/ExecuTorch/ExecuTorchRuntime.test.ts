import { ExecuTorchRunInput } from '@/InferenceModel/ExecuTorch/ExecuTorchRunInput';
import { ExecuTorchRuntime } from '@/InferenceModel/ExecuTorch/ExecuTorchRuntime';
import {
    ExecuTorchDimension,
    ExecuTorchDimensionKind,
    ExecuTorchProgram,
    ExecuTorchParameter,
} from '@/InferenceModel/ExecuTorch';
import type {
    ExecuTorchBackend,
    ExecuTorchDType,
    ExecuTorchTensor,
} from '@/InferenceModel/ExecuTorch';
import { ExecuTorchException } from '@/Exception';

const constantDims = (shape: readonly number[]) => shape.map((value) => ExecuTorchDimension.constant(value));
const floatTensor = (shape: readonly number[]) => ExecuTorchParameter.tensor('float32', constantDims(shape));
const dynamicRangeOutput = () => ExecuTorchParameter.tensor('float32', [ExecuTorchDimension.dynamic(ExecuTorchDimensionKind.Range)]);

class FakeTensor implements ExecuTorchTensor {
    public readonly data: Float32Array | BigInt64Array;
    public disposeCount = 0;

    public constructor(
        dtype: ExecuTorchDType,
        public readonly shape: readonly number[],
        source?: Float32Array | BigInt64Array,
    ) {
        const elements = shape.reduce((product, size) => product * size, 1);
        if (source != null) {
            this.data = source;
        } else {
            this.data = dtype === 'int64' ? new BigInt64Array(elements) : new Float32Array(elements);
        }
    }

    public getData(destination: Float32Array | BigInt64Array): Float32Array | BigInt64Array {
        if (this.data instanceof BigInt64Array && destination instanceof BigInt64Array) {
            destination.set(this.data);
        } else if (this.data instanceof Float32Array && destination instanceof Float32Array) {
            destination.set(this.data);
        }
        return destination;
    }

    public writeFloat(source: Float32Array): void {
        if (this.data instanceof Float32Array) {
            this.data.set(source);
        }
    }

    public dispose(): void {
        this.disposeCount += 1;
    }
}

class FakeBackend implements ExecuTorchBackend {
    public readonly models = new Map<string, ExecuTorchProgram>();
    public readonly requestedPaths: string[] = [];
    public readonly createdTensors: FakeTensor[] = [];

    public async loadProgram(path: string): Promise<ExecuTorchProgram> {
        this.requestedPaths.push(path);
        const model = this.models.get(path);
        if (model == null) {
            throw new Error(`fake model not registered at '${path}'`);
        }
        return model;
    }

    public createTensor(dtype: ExecuTorchDType, shape: readonly number[], source?: Float32Array | BigInt64Array): ExecuTorchTensor {
        const tensor = new FakeTensor(dtype, shape, source);
        this.createdTensors.push(tensor);
        return tensor;
    }
}

const makeDoublingModel = (schema: ReadonlyMap<string, readonly ExecuTorchParameter[]>): ExecuTorchProgram =>
    new ExecuTorchProgram(
        '/m.pte',
        schema,
        (_methodName: string, inputs: readonly ExecuTorchTensor[], outputTensors: readonly ExecuTorchTensor[]) => {
            const source = (inputs[0] as FakeTensor).data;
            const doubled = source instanceof Float32Array ? Float32Array.from(source, (value) => value * 2) : new Float32Array(0);
            (outputTensors[0] as FakeTensor).writeFloat(doubled);
        },
        () => undefined,
    );

const SIMPLE_SCHEMA = new Map([['forward', [floatTensor([1, 2])]]]);

describe('ExecuTorchRuntime', () => {
    let backend: FakeBackend;
    let runtime: ExecuTorchRuntime;

    beforeEach(() => {
        backend = new FakeBackend();
        runtime = new ExecuTorchRuntime(backend);
    });

    it('runs a loaded model and returns the output data', async () => {
        backend.models.set('/m.pte', makeDoublingModel(SIMPLE_SCHEMA));

        const program = await runtime.load('/m.pte');
        const outputs = runtime.run(program, [ExecuTorchRunInput.create(new Float32Array([1, 2]), [1, 2])]);

        expect(Array.from(outputs[0])).toEqual([2, 4]);
    });

    it('strips the file scheme before handing the path to the native loader', async () => {
        backend.models.set('/m.pte', makeDoublingModel(SIMPLE_SCHEMA));

        await runtime.load('file:///m.pte');

        expect(backend.requestedPaths).toEqual(['/m.pte']);
    });

    it('rejects a method name the model does not declare', async () => {
        backend.models.set('/m.pte', makeDoublingModel(SIMPLE_SCHEMA));

        const program = await runtime.load('/m.pte');

        expect(() => runtime.run(program, [ExecuTorchRunInput.create(new Float32Array([1, 2]), [1, 2])], 'backward')).toThrow(ExecuTorchException);
    });

    it('rejects outputs that declare dynamic dimensions', async () => {
        const dynamicSchema = new Map([['forward', [floatTensor([1, 2]), dynamicRangeOutput()]]]);
        backend.models.set('/m.pte', makeDoublingModel(dynamicSchema));

        const program = await runtime.load('/m.pte');

        expect(() => runtime.run(program, [ExecuTorchRunInput.create(new Float32Array([1, 2]), [1, 2])])).toThrow(/constant/i);
    });

    it('rejects outputs that are not tensors', async () => {
        const scalarSchema = new Map([
            ['forward', [floatTensor([1, 2]), ExecuTorchParameter.scalar('Int')]],
        ]);
        backend.models.set('/m.pte', makeDoublingModel(scalarSchema));

        const program = await runtime.load('/m.pte');

        expect(() => runtime.run(program, [ExecuTorchRunInput.create(new Float32Array([1, 2]), [1, 2])])).toThrow(/tensor/i);
    });

    it('rejects inputs whose data does not match their declared shape', async () => {
        backend.models.set('/m.pte', makeDoublingModel(SIMPLE_SCHEMA));

        const program = await runtime.load('/m.pte');

        expect(() => runtime.run(program, [ExecuTorchRunInput.create(new Float32Array([1, 2, 3]), [1, 2])])).toThrow(ExecuTorchException);
        expect(backend.createdTensors.length).toBe(0);
    });

    it('disposes input and output tensors after execution', async () => {
        backend.models.set('/m.pte', makeDoublingModel(SIMPLE_SCHEMA));

        const program = await runtime.load('/m.pte');
        runtime.run(program, [ExecuTorchRunInput.create(new Float32Array([1, 2]), [1, 2])]);

        expect(backend.createdTensors.length).toBe(2);
        expect(backend.createdTensors.every((tensor) => tensor.disposeCount === 1)).toBe(true);
    });
});
