jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

import { RuntimeBenchmark } from '@/DevConsole/RuntimeBenchmark';
import type { EmbeddingEngine } from '@/DevConsole/RuntimeBenchmark';
import { AppLogger } from '@/Core/AppLogger';

class FakeEngine implements EmbeddingEngine {
    public readonly name: string;
    public loadCalls: string[] = [];
    public runCalls = 0;
    public disposed = false;
    public latencyMs: number;
    public vector: Float32Array;

    public constructor(name: string, vector: Float32Array, latencyMs = 0) {
        this.name = name;
        this.vector = vector;
        this.latencyMs = latencyMs;
    }

    public async load(path: string): Promise<void> {
        this.loadCalls.push(path);
    }

    public async run(_features: Float32Array, _shape: readonly number[]): Promise<Float32Array> {
        this.runCalls += 1;
        return this.vector;
    }

    public async dispose(): Promise<void> {
        this.disposed = true;
    }
}

const DIM = 512;
const ORT_PATH = '/tmp/campp.onnx';
const PTE_PATH = 'file:///Documents/campp_xnnpack.pte';

function createVectors(): { ort: Float32Array; et: Float32Array } {
    const ort = new Float32Array(DIM);
    const et = new Float32Array(DIM);
    for (let i = 0; i < DIM; i += 1) {
        ort[i] = Math.sin(i) * 0.5;
        et[i] = Math.sin(i) * 0.5 + 0.00001;
    }
    return { ort, et };
}

function createBenchmark(ort: EmbeddingEngine, et: EmbeddingEngine): RuntimeBenchmark {
    const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as AppLogger;
    return new RuntimeBenchmark(logger, ort, et);
}

describe('RuntimeBenchmark', () => {
    it('starts with an empty snapshot and is not loading', () => {
        const { ort, et } = createVectors();
        const benchmark = createBenchmark(new FakeEngine('ort', ort), new FakeEngine('et', et));

        expect(benchmark.isLoading).toBe(false);
        expect(benchmark.snapshot.ort).toBeNull();
        expect(benchmark.snapshot.executorTorch).toBeNull();
        expect(benchmark.snapshot.cosine).toBeNull();
        expect(benchmark.snapshot.error).toBeNull();
    });

    it('loads both engines with their respective paths', async () => {
        const { ort, et } = createVectors();
        const ortEngine = new FakeEngine('ort', ort);
        const etEngine = new FakeEngine('et', et);
        const benchmark = createBenchmark(ortEngine, etEngine);

        await benchmark.run(ORT_PATH, PTE_PATH, DIM);

        expect(ortEngine.loadCalls).toEqual([ORT_PATH]);
        expect(etEngine.loadCalls).toEqual([PTE_PATH]);
    });

    it('produces cosine and max abs diff between the two embeddings', async () => {
        const { ort, et } = createVectors();
        const benchmark = createBenchmark(new FakeEngine('ort', ort), new FakeEngine('et', et));

        await benchmark.run(ORT_PATH, PTE_PATH, DIM);

        expect(benchmark.snapshot.cosine).toBeCloseTo(1, 5);
        expect(benchmark.snapshot.maxAbsDiff).toBeCloseTo(0.00001, 6);
    });

    it('reports per-engine embedding dim and iteration count', async () => {
        const { ort, et } = createVectors();
        const benchmark = createBenchmark(new FakeEngine('ort', ort), new FakeEngine('et', et));

        await benchmark.run(ORT_PATH, PTE_PATH, DIM);

        expect(benchmark.snapshot.ort?.embeddingDim).toBe(DIM);
        expect(benchmark.snapshot.executorTorch?.embeddingDim).toBe(DIM);
        expect(benchmark.snapshot.ort?.iterations).toBeGreaterThan(0);
        expect(benchmark.snapshot.executorTorch?.iterations).toBeGreaterThan(0);
    });

    it('runs each engine load+iterations times and disposes them', async () => {
        const { ort, et } = createVectors();
        const ortEngine = new FakeEngine('ort', ort);
        const etEngine = new FakeEngine('et', et);
        const benchmark = createBenchmark(ortEngine, etEngine);

        await benchmark.run(ORT_PATH, PTE_PATH, DIM);

        expect(ortEngine.runCalls).toBe(benchmark.snapshot.ort?.iterations);
        expect(etEngine.runCalls).toBe(benchmark.snapshot.executorTorch?.iterations);
        expect(ortEngine.disposed).toBe(true);
        expect(etEngine.disposed).toBe(true);
    });

    it('reports an error and keeps snapshot clean when an engine load fails', async () => {
        const { ort } = createVectors();
        const failingEngine: EmbeddingEngine = {
            name: 'et',
            load: jest.fn().mockRejectedValue(new Error('pte file corrupted')),
            run: jest.fn(),
            dispose: jest.fn(),
        };
        const benchmark = createBenchmark(new FakeEngine('ort', ort), failingEngine);

        await expect(benchmark.run(ORT_PATH, PTE_PATH, DIM)).rejects.toThrow('pte file corrupted');

        expect(benchmark.snapshot.error).toContain('pte file corrupted');
        expect(benchmark.snapshot.cosine).toBeNull();
        expect(benchmark.isLoading).toBe(false);
    });

    it('rejects a non-positive output dimension', async () => {
        const { ort, et } = createVectors();
        const benchmark = createBenchmark(new FakeEngine('ort', ort), new FakeEngine('et', et));

        await expect(benchmark.run(ORT_PATH, PTE_PATH, 0)).rejects.toThrow('Output dimension');
    });
});
