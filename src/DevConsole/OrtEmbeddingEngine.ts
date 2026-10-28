import type * as Ort from 'onnxruntime-react-native';
import { Runtime } from '@/InferenceModel/Runtime';
import type { EmbeddingEngine } from './RuntimeBenchmark';

/** ONNX Runtime engine: runs the reference .onnx speaker model on CPU. */
export class OrtEmbeddingEngine implements EmbeddingEngine {
    public readonly name = 'ONNX Runtime (CPU)';

    private session: Ort.InferenceSession | null = null;

    public async load(path: string): Promise<void> {
        const ort = await Runtime.ensureOrt();
        this.session = await ort.InferenceSession.create(path, {
            executionProviders: ['cpu'],
        });
    }

    public async run(features: Float32Array, shape: readonly number[]): Promise<Float32Array> {
        const session = this.session;
        if (session == null) {
            throw new Error('OrtEmbeddingEngine not loaded. Call load() first.');
        }

        const ort = await Runtime.ensureOrt();
        const inputName = session.inputNames[0];
        const outputName = session.outputNames[0];
        const inputTensor = new ort.Tensor('float32', features, [...shape]);
        const results = await session.run({ [inputName]: inputTensor });
        const outputTensor = results[outputName];

        return outputTensor.data as Float32Array;
    }

    public async dispose(): Promise<void> {
        const session = this.session;
        if (session == null) {
            return;
        }

        const maybe = session as unknown as { dispose?: () => Promise<void> | void; release?: () => Promise<void> | void };
        if (typeof maybe.dispose === 'function') {
            await maybe.dispose();
        } else if (typeof maybe.release === 'function') {
            await maybe.release();
        }
        this.session = null;
    }
}
