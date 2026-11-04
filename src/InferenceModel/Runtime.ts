import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { UnsupportedCapabilityException } from '@/Exception';
import { Downloader } from './Downloader';
import type { InferenceModel } from './Model';

/**
 * Runtime – Single entry point of the inference stack. Every capability is a
 * self-managed ExecuTorch pipeline: the model owns its engine end to end — it
 * downloads its own bundle and drives the ExecuTorch runtime itself (the
 * Runtime never attaches an ONNX session) — so this class only resolves,
 * initializes and caches model instances per capability.
 */
export class Runtime {
    private models = new Map<string, InferenceModel>();
    private isInitialized = false;

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly downloader: Downloader = Container.get(Downloader),
    ) {}

    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;
        this.logger.debug('[Runtime] Initialized');
    }

    public async dispose(): Promise<void> {
        for (const model of this.models.values()) {
            await model.dispose();
        }
        this.models.clear();

        this.isInitialized = false;
        this.logger.debug('[Runtime] Disposed all models');
    }

    public async isReady(): Promise<boolean> {
        return this.isInitialized;
    }

    public async load(capability: string): Promise<void> {
        if (!this.models.has(capability)) {
            const model = await this.createModel(capability);
            this.models.set(capability, model);
            await model.initialize();
        }
    }

    public async getModel<T extends InferenceModel>(capability: string): Promise<T> {
        await this.load(capability);
        const model = this.models.get(capability);
        if (!model) {
            throw new UnsupportedCapabilityException(
                `Model ${capability} could not be loaded after initialization`,
            );
        }
        return model as T;
    }

    private async createModel(capability: string): Promise<InferenceModel> {
        switch (capability) {
            case 'speaker_id': {
                const { SpeakerId } = await import('./Model/SpeakerId');
                return new SpeakerId(this.downloader, await this.createExecuTorchRuntime(), this.logger);
            }
            case 'asr': {
                const { Asr } = await import('./Model/Asr');
                return new Asr(this.downloader, await this.createExecuTorchRuntime(), this.logger);
            }
            case 'vad': {
                const { Vad } = await import('./Model/Vad');
                return new Vad(this.downloader, await this.createExecuTorchRuntime(), this.logger);
            }
            case 'pitch': {
                const { Pitch } = await import('./Model/Pitch');
                return new Pitch(this.downloader, await this.createExecuTorchRuntime(), this.logger);
            }
            default:
                throw new UnsupportedCapabilityException(`Unknown model capability: ${capability}`);
        }
    }

    private async createExecuTorchRuntime(): Promise<import('./ExecuTorch').ExecuTorchRuntime> {
        const { ExecuTorchRuntime } = await import('./ExecuTorch');
        const { ReactNativeExecuTorchBackend } = await import('./ExecuTorch/ReactNativeExecuTorchBackend');

        return new ExecuTorchRuntime(new ReactNativeExecuTorchBackend());
    }
}

Container.register(Runtime, () => new Runtime(Container.get(AppLogger), Container.get(Downloader)));
