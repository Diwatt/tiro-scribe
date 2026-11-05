import { Container } from '@/Core/Container';
import { Asr } from '@/InferenceModel/Model';
import { Runtime } from '@/InferenceModel/Runtime';
import type { SpeechToTextRunner, SpeechToTextRunnerFactory } from '../State/SpeechToTextBenchmark';
import { ParakeetRunner } from './ParakeetRunner';

/**
 * Loads the Parakeet ASR capability through the Runtime (bundle download
 * included on first run) and adapts it to the engine-agnostic
 * SpeechToTextRunner contract.
 */
export class ParakeetRunnerFactory implements SpeechToTextRunnerFactory {
    public constructor(private readonly runtime: Runtime) {}

    public async create(): Promise<SpeechToTextRunner> {
        const model = await this.runtime.getModel<Asr>(Asr.CAPABILITY);

        return new ParakeetRunner(model);
    }
}

Container.register(
    ParakeetRunnerFactory,
    () => new ParakeetRunnerFactory(Container.get(Runtime)),
);
