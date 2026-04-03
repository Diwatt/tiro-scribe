import type * as Ort from 'onnxruntime-react-native';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { OnnxRuntimeError, SessionNotInitializedError } from '@/Exception';
import { Downloader } from './Downloader';
import type { InferenceModel } from './Model';

type DisposableSession = {
    dispose?: () => Promise<void> | void;
    release?: () => Promise<void> | void;
};

export class Runtime implements InferenceModel {
    private static cachedOrt: typeof Ort | null = null;

    private sessions = new Map<string, Ort.InferenceSession>();
    private models = new Map<string, InferenceModel>();
    private isInitialized = false;

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly downloader: Downloader = Container.get(Downloader),
    ) {}

    public static async ensureOrt(): Promise<typeof Ort> {
        if (Runtime.cachedOrt == null) {
            try {
                Runtime.cachedOrt = await import('onnxruntime-react-native');
            } catch (err) {
                const original = err instanceof Error ? err : new Error(String(err));
                throw new OnnxRuntimeError(
                    'onnxruntime-react-native native module unavailable. Make sure you are running a development build (npx expo run:android / npx expo run:ios) or an EAS build, not Expo Go.',
                    original,
                );
            }

            if (!Runtime.cachedOrt || typeof Runtime.cachedOrt.InferenceSession !== 'function') {
                throw new OnnxRuntimeError(
                    'onnxruntime-react-native initialization failed: native bindings are missing. ' +
                        'Ensure the app is built with the onnxruntime native module and is running in a dev/client build.',
                );
            }
        }

        return Runtime.cachedOrt;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            this.isInitialized = true;
            this.logger.debug('[Runtime] Initialized');
        } catch (error) {
            this.logger.error('[Runtime] Failed to initialize', { error });
            throw error;
        }
    }

    public async dispose(): Promise<void> {
        try {
            for (const model of this.models.values()) {
                await model.dispose();
            }
            this.models.clear();

            for (const capability of this.sessions.keys()) {
                await this.release(capability);
            }

            this.isInitialized = false;
            this.logger.debug('[Runtime] Disposed all models and sessions');
        } catch (error) {
            this.logger.error('[Runtime] Error during dispose', { error });
        }
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

        if (this.sessions.has(capability)) {
            return;
        }

        if (this.sessions.size > 0) {
            for (const existing of this.sessions.keys()) {
                this.sessions.delete(existing);
                this.logger.debug('[Runtime] unloaded previous session', { capability: existing });
            }
        }

        let modelPath = this.downloader.getLocalPath(capability);
        if (!modelPath) {
            const executor = await this.downloader.download(capability);
            modelPath = this.downloader.getLocalPathForFile(executor.config, executor.config.files[0]);
        }

        if (!modelPath) {
            throw new Error(`Model for ${capability} not available`);
        }

        const ort = await Runtime.ensureOrt();
        const session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['cpu'],
        });
        this.sessions.set(capability, session);
        this.logger.debug('[Runtime] session loaded', { capability, modelPath });
    }

    public async getModel<T extends InferenceModel>(capability: string): Promise<T> {
        await this.load(capability);
        const model = this.models.get(capability);
        if (!model) {
            throw new Error(`Model ${capability} could not be loaded`);
        }
        return model as T;
    }

    public async release(capability: string): Promise<void> {
        const session = this.sessions.get(capability);
        if (session) {
            const maybe = session as unknown as DisposableSession;
            if (typeof maybe.dispose === 'function') {
                await maybe.dispose();
            } else if (typeof maybe.release === 'function') {
                await maybe.release();
            }
            this.sessions.delete(capability);
            this.logger.debug('[Runtime] session released', { capability });
        }
    }

    public async run(capability: string, features: Float32Array, shape: readonly number[], ..._args: unknown[]): Promise<number[]> {
        return this.runRaw(capability, features, shape);
    }

    public async runRaw(capability: string, features: Float32Array, shape: readonly number[]): Promise<number[]> {
        const session = this.sessions.get(capability);
        if (!session) {
            throw new SessionNotInitializedError(`ONNX Runtime session not initialized for ${capability}`);
        }

        const inputName = session.inputNames[0];
        const outputName = session.outputNames[0];

        const ort = await Runtime.ensureOrt();
        const tensor = new ort.Tensor('float32', features, shape);
        const results = await session.run({ [inputName]: tensor });
        const outputTensor = results[outputName];
        return Array.from(outputTensor.data as Float32Array);
    }

    private async createModel(capability: string): Promise<InferenceModel> {
        switch (capability) {
            case 'speaker_id': {
                const { SpeakerId } = await import('./Model/SpeakerId');
                return new SpeakerId(this.downloader, this, this.logger);
            }
            case 'asr': {
                const { AutomaticSpeechRecognizer } = await import('./Model/AutomaticSpeechRecognizer');
                return new AutomaticSpeechRecognizer(this.downloader, this, this.logger);
            }
            default:
                throw new Error(`Unknown model capability: ${capability}`);
        }
    }
}

Container.register(Runtime, () => new Runtime(Container.get(AppLogger), Container.get(Downloader)));