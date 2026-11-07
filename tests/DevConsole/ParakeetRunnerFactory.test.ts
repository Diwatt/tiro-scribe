import { Asr } from '@/InferenceModel/Model';
import { AsrRunMetric } from '@/InferenceModel/Model/AsrRunMetric';
import { ParakeetRunnerFactory } from '@/DevConsole/Benchmark/ParakeetRunnerFactory';
import type { Runtime } from '@/InferenceModel/Runtime';

const makeModel = (): { run: jest.Mock; dispose: jest.Mock } => ({
    run: jest
        .fn()
        .mockResolvedValue(AsrRunMetric.create('Atomes et matière.', [12, 13, 14, 15], [0, 0, 0, 0], 1, 2, 3, 6, 4, 3)),
    dispose: jest.fn().mockResolvedValue(undefined),
});

const makeFactory = (model: ReturnType<typeof makeModel>): {
    factory: ParakeetRunnerFactory;
    runtime: { getModel: jest.Mock };
} => {
    const runtime = { getModel: jest.fn().mockResolvedValue(model) } as unknown as Runtime;
    const factory = new ParakeetRunnerFactory(runtime);

    return { factory, runtime: runtime as unknown as { getModel: jest.Mock } };
};

describe('ParakeetRunnerFactory', () => {
    it('loads the asr capability through the runtime', async () => {
        const model = makeModel();
        const { factory, runtime } = makeFactory(model);

        const runner = await factory.create();

        expect(runtime.getModel).toHaveBeenCalledTimes(1);
        expect(runtime.getModel).toHaveBeenCalledWith(Asr.CAPABILITY);
        expect(runner).toBeDefined();
    });

    it('routes transcribe to the asr model and ignores the language hint', async () => {
        const model = makeModel();
        const { factory } = makeFactory(model);
        const runner = await factory.create();
        const audio = new Float32Array([0, 0.5, -0.5]);

        const transcript = await runner.transcribe(audio, 'en');

        expect(transcript).toBe('Atomes et matière.');
        expect(model.run).toHaveBeenCalledTimes(1);
        expect(model.run).toHaveBeenCalledWith(audio);
    });

    it('routes dispose to the asr model', async () => {
        const model = makeModel();
        const { factory } = makeFactory(model);
        const runner = await factory.create();

        await runner.dispose();

        expect(model.dispose).toHaveBeenCalledTimes(1);
    });
});
