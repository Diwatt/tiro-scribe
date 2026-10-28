import {
    loadModel,
    schema,
    tensor,
    wrapAsync,
} from 'react-native-executorch';
import type { Model } from 'react-native-executorch';
import type { EmbeddingEngine } from './RuntimeBenchmark';

/**
 * ExecuTorch engine: runs a .pte export (XNNPACK) with fixed input shape.
 * Model execution happens on the worklet runtime thread; the output dimension
 * is read from the model's own embedded schema, never hardcoded.
 */
export class ExecuTorchEmbeddingEngine implements EmbeddingEngine {
    public readonly name = 'ExecuTorch (XNNPACK)';

    private model: Model | null = null;
    private embeddingDim = 0;

    public async load(path: string): Promise<void> {
        const model = await wrapAsync(loadModel)(path);

        // T est figé à l'export (500) : un placeholder string matche la constante et
        // DynamicDim exigerait une dim dynamique, absente du .pte.
        const { dims } = schema.validateSpec(model.schema, {
            batched: schema.method('forward', [schema.f32(1, 'T', 80)], [schema.f32(1, 'D')], []),
        });
        const [embeddingDim] = dims.constant('D');

        this.model = model;
        this.embeddingDim = embeddingDim;
    }

    public async run(features: Float32Array, shape: readonly number[]): Promise<Float32Array> {
        const model = this.model;
        if (model == null) {
            throw new Error('ExecuTorchEmbeddingEngine not loaded. Call load() first.');
        }

        const shapeCopy = [...shape];
        const embeddingDim = this.embeddingDim;

        return wrapAsync(() => {
            'worklet';
            const inputTensor = tensor('float32', shapeCopy, features);
            const outputTensor = tensor('float32', [shapeCopy[0], embeddingDim]);
            try {
                model.execute('forward', [inputTensor], [outputTensor]);
                return outputTensor.getData(new Float32Array(outputTensor.numel));
            } finally {
                inputTensor.dispose();
                outputTensor.dispose();
            }
        })();
    }

    public async dispose(): Promise<void> {
        const model = this.model;
        this.model = null;
        if (model != null) {
            model.dispose();
        }
    }
}
