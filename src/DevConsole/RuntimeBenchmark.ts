import { observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';

/**
 * A single inference engine under benchmark (ORT, ExecuTorch, …).
 * Loads a model from a local path and runs it on fixed-shape feature input.
 */
export interface EmbeddingEngine {
    readonly name: string;
    load(path: string): Promise<void>;
    run(features: Float32Array, shape: readonly number[]): Promise<Float32Array>;
    dispose(): Promise<void>;
}

/** Benchmark metrics for one engine. */
export interface EngineBenchmark {
    engineName: string;
    embeddingDim: number;
    loadLatencyMs: number;
    firstRunLatencyMs: number;
    avgRunLatencyMs: number;
    iterations: number;
    firstValues: number[];
}

interface RuntimeBenchmarkSnapshot {
    isLoading: boolean;
    ort: EngineBenchmark | null;
    executorTorch: EngineBenchmark | null;
    cosine: number | null;
    maxAbsDiff: number | null;
    error: string | null;
}

const INITIAL_STATE: RuntimeBenchmarkSnapshot = {
    isLoading: false,
    ort: null,
    executorTorch: null,
    cosine: null,
    maxAbsDiff: null,
    error: null,
};

export class RuntimeBenchmark {
    private static readonly ITERATIONS = 5;
    private static readonly TIME_FRAMES = 500;
    private static readonly MEL_BINS = 80;
    private static readonly RANDOM_SEED = 20261028;
    private static readonly LCG_MULTIPLIER = 1664525;
    private static readonly LCG_INCREMENT = 1013904223;
    private static readonly LCG_MODULO = 4294967296;

    public readonly state$ = observable(INITIAL_STATE);

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly ortEngine: EmbeddingEngine,
        private readonly executorTorchEngine: EmbeddingEngine,
    ) {}

    public get isLoading(): boolean {
        return this.state$.isLoading.get();
    }

    public get snapshot(): RuntimeBenchmarkSnapshot {
        return {
            isLoading: this.state$.isLoading.get(),
            ort: this.state$.ort.get(),
            executorTorch: this.state$.executorTorch.get(),
            cosine: this.state$.cosine.get(),
            maxAbsDiff: this.state$.maxAbsDiff.get(),
            error: this.state$.error.get(),
        };
    }

    public async run(ortModelPath: string, executorTorchModelPath: string, embeddingDim: number): Promise<void> {
        if (!Number.isInteger(embeddingDim) || embeddingDim <= 0) {
            throw new Error(`Output dimension must be a positive integer, got ${embeddingDim}`);
        }

        this.state$.set({ ...INITIAL_STATE, isLoading: true });

        try {
            const features = this.buildDeterministicFeatures();
            const shape = [1, RuntimeBenchmark.TIME_FRAMES, RuntimeBenchmark.MEL_BINS] as const;

            let inputSum = 0;
            for (let index = 0; index < features.length; index += 1) {
                inputSum += features[index];
            }

            const ort = await this.benchmarkEngine(
                this.ortEngine,
                ortModelPath,
                features,
                shape,
                embeddingDim,
            );
            const executorTorch = await this.benchmarkEngine(
                this.executorTorchEngine,
                executorTorchModelPath,
                features,
                shape,
                embeddingDim,
            );

            const cosine = this.cosineSimilarity(ort.vector, executorTorch.vector);
            const maxAbsDiff = this.maxAbsDifference(ort.vector, executorTorch.vector);

            this.state$.ort.set(ort);
            this.state$.executorTorch.set(executorTorch);
            this.state$.cosine.set(cosine);
            this.state$.maxAbsDiff.set(maxAbsDiff);

            await this.ortEngine.dispose();
            await this.executorTorchEngine.dispose();

            this.logger.debug('[RuntimeBenchmark] done', {
                cosine,
                maxAbsDiff,
                inputSum: inputSum.toFixed(4),
                ortFirst: ort.firstValues,
                executorTorchFirst: executorTorch.firstValues,
                ortAvgMs: ort.avgRunLatencyMs,
                executorTorchAvgMs: executorTorch.avgRunLatencyMs,
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.state$.error.set(message);
            this.logger.error('[RuntimeBenchmark] failed', { message });
            throw error;
        } finally {
            this.state$.isLoading.set(false);
        }
    }

    public dismissError(): void {
        this.state$.error.set(null);
    }

    private async benchmarkEngine(
        engine: EmbeddingEngine,
        modelPath: string,
        features: Float32Array,
        shape: readonly number[],
        embeddingDim: number,
    ): Promise<EngineBenchmark & { vector: Float32Array }> {
        const loadStartedAtMs = Date.now();
        await engine.load(modelPath);
        const loadLatencyMs = Date.now() - loadStartedAtMs;

        const firstRunStartedAtMs = Date.now();
        let vector = await engine.run(features, shape);
        const firstRunLatencyMs = Date.now() - firstRunStartedAtMs;

        let totalMs = 0;
        for (let iteration = 1; iteration < RuntimeBenchmark.ITERATIONS; iteration += 1) {
            const startedAtMs = Date.now();
            vector = await engine.run(features, shape);
            totalMs += Date.now() - startedAtMs;
        }

        const measuredIterations = RuntimeBenchmark.ITERATIONS - 1;
        const firstValues = Array.from(vector.slice(0, 5));
        return {
            engineName: engine.name,
            embeddingDim,
            loadLatencyMs,
            firstRunLatencyMs,
            avgRunLatencyMs: measuredIterations > 0 ? Math.round(totalMs / measuredIterations) : firstRunLatencyMs,
            iterations: RuntimeBenchmark.ITERATIONS,
            firstValues,
            vector,
        };
    }

    private buildDeterministicFeatures(): Float32Array {
        const total = RuntimeBenchmark.TIME_FRAMES * RuntimeBenchmark.MEL_BINS;
        const features = new Float32Array(total);
        const random = { value: RuntimeBenchmark.RANDOM_SEED };

        for (let index = 0; index < total; index += 1) {
            random.value = (random.value * RuntimeBenchmark.LCG_MULTIPLIER + RuntimeBenchmark.LCG_INCREMENT) %
                RuntimeBenchmark.LCG_MODULO;
            features[index] = (random.value / RuntimeBenchmark.LCG_MODULO) * 2 - 1;
        }

        return features;
    }

    private cosineSimilarity(first: Float32Array, second: Float32Array): number {
        if (first.length !== second.length) {
            throw new Error(`Embedding length mismatch: ${first.length} vs ${second.length}`);
        }

        let dotProduct = 0;
        let firstMagnitude = 0;
        let secondMagnitude = 0;

        for (let index = 0; index < first.length; index += 1) {
            dotProduct += first[index] * second[index];
            firstMagnitude += first[index] * first[index];
            secondMagnitude += second[index] * second[index];
        }

        const denominator = Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    private maxAbsDifference(first: Float32Array, second: Float32Array): number {
        let maxAbsDiff = 0;

        for (let index = 0; index < first.length; index += 1) {
            const diff = Math.abs(first[index] - second[index]);
            if (diff > maxAbsDiff) {
                maxAbsDiff = diff;
            }
        }

        return maxAbsDiff;
    }
}
