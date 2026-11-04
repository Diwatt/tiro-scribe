import { ExecuTorchException } from '@/Exception';

/**
 * ExecuTorchRunInput – Named input for a program execution: the flat data
 * buffer and the shape it is interpreted with. Built through `create`, which
 * refuses buffers whose length does not match the declared shape.
 */
export class ExecuTorchRunInput {
    public constructor(
        public readonly data: Float32Array | BigInt64Array,
        public readonly shape: readonly number[],
    ) {}

    public static create(data: Float32Array | BigInt64Array, shape: readonly number[]): ExecuTorchRunInput {
        const elements = shape.reduce((product, size) => product * size, 1);
        if (data.length !== elements) {
            throw new ExecuTorchException(
                `ExecuTorch input data holds ${data.length} elements but shape [${shape.join(',')}] declares ${elements}`,
            );
        }

        return new ExecuTorchRunInput(data, shape);
    }
}
