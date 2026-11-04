import {
    ExecuTorchDimension,
    ExecuTorchParameter,
    ExecuTorchProgramSchema,
} from '@/InferenceModel/ExecuTorch';
import type { ExecuTorchTensor } from '@/InferenceModel/ExecuTorch';
import { ExecuTorchException } from '@/Exception';

// ---------------------------------------------------------------------------
// Mocks – the native module throws at import time without a JSI runtime.
// ---------------------------------------------------------------------------

const mockLoadModel = jest.fn();
const mockTensor = jest.fn();

jest.mock('react-native-executorch', () => ({
    loadModel: (...args: unknown[]) => mockLoadModel(...args),
    tensor: (...args: unknown[]) => mockTensor(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { ReactNativeExecuTorchBackend } from '@/InferenceModel/ExecuTorch/ReactNativeExecuTorchBackend';

// Raw JSON shape exactly as the native bridge delivers it.
const constantDim = (value: number) => ({ kind: 'constant', value });
const floatTensorRaw = (shape: readonly number[]) => ({
    kind: 'Tensor',
    dtype: 'float32',
    shape: shape.map(constantDim),
});

const validRawSchema = {
    forward: {
        inputs: [floatTensorRaw([1, 2])],
        outputs: [floatTensorRaw([1, 2])],
    },
};

const expectedForwardOutputs = (): readonly ExecuTorchParameter[] =>
    [ExecuTorchParameter.tensor('float32', [ExecuTorchDimension.constant(1), ExecuTorchDimension.constant(2)])];

const makeNativePayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    path: '/ignored-native-path.pte',
    schema: validRawSchema,
    execute: jest.fn(),
    dispose: jest.fn(),
    ...overrides,
});

describe('ReactNativeExecuTorchBackend', () => {
    let backend: ReactNativeExecuTorchBackend;

    beforeEach(() => {
        jest.clearAllMocks();
        backend = new ReactNativeExecuTorchBackend();
    });

    describe('loadProgram', () => {
        it('returns a program carrying the parsed output map and the requested path', async () => {
            mockLoadModel.mockResolvedValue(makeNativePayload());

            const program = await backend.loadProgram('/m.pte');

            expect(program.path).toBe('/m.pte');
            expect(program.schema.get('forward')).toEqual(expectedForwardOutputs());
            expect(mockLoadModel).toHaveBeenCalledWith('/m.pte');
        });

        it('rejects a native payload whose schema does not match the .pte method format', async () => {
            mockLoadModel.mockResolvedValue(makeNativePayload({ schema: { forward: { inputs: 'not-an-array' } } }));

            await expect(backend.loadProgram('/m.pte')).rejects.toThrow(ExecuTorchException);
            await expect(backend.loadProgram('/m.pte')).rejects.toThrow(/invalid method schema/i);
        });

        it('rejects a native payload that is missing the execute method', async () => {
            mockLoadModel.mockResolvedValue(makeNativePayload({ execute: undefined }));

            await expect(backend.loadProgram('/m.pte')).rejects.toThrow(ExecuTorchException);
        });

        it('rejects a native payload that is missing the dispose method', async () => {
            mockLoadModel.mockResolvedValue(makeNativePayload({ dispose: undefined }));

            await expect(backend.loadProgram('/m.pte')).rejects.toThrow(ExecuTorchException);
        });
    });

    describe('createTensor', () => {
        it('forwards the dtype and shape to the native tensor factory', () => {
            const source = new Float32Array([1, 2]);
            const nativeTensor = { shape: [1, 2] } as unknown as ExecuTorchTensor;
            mockTensor.mockReturnValue(nativeTensor);

            const created = backend.createTensor('float32', [1, 2], source);

            expect(created).toBe(nativeTensor);
            expect(mockTensor).toHaveBeenCalledWith('float32', [1, 2], source);
        });

        it('creates int64 tensors when asked', () => {
            backend.createTensor('int64', [1, 1]);

            expect(mockTensor).toHaveBeenCalledWith('int64', [1, 1], undefined);
        });
    });
});
