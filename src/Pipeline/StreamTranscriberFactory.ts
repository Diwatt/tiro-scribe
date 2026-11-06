import { Container } from '@/Core/Container';
import { AppLogger } from '@/Core/AppLogger';
import { Asr } from '@/InferenceModel/Model';
import { Vad } from '@/InferenceModel/Model';
import { Runtime } from '@/InferenceModel/Runtime';
import { PcmSampleConverter } from '@/Math';
import { StreamTranscriber } from './StreamTranscriber';

/**
 * StreamTranscriberFactory - loads the vad and asr capabilities through the
 * Runtime (bundle download included on first run) and wires them into a
 * StreamTranscriber.
 */
export class StreamTranscriberFactory {
    public constructor(
        private readonly runtime: Runtime,
        private readonly sampleConverter: PcmSampleConverter,
        private readonly logger: AppLogger,
    ) {}

    public async create(): Promise<StreamTranscriber> {
        const vad = await this.runtime.getModel<Vad>(Vad.CAPABILITY);
        const asr = await this.runtime.getModel<Asr>(Asr.CAPABILITY);

        return new StreamTranscriber(vad, asr, this.sampleConverter, this.logger);
    }
}

Container.register(
    StreamTranscriberFactory,
    () =>
        new StreamTranscriberFactory(
            Container.get(Runtime),
            Container.get(PcmSampleConverter),
            Container.get(AppLogger),
        ),
);
