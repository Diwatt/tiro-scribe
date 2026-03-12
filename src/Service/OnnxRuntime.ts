import type * as Ort from 'onnxruntime-react-native';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { SessionNotInitializedError } from '@/Exception';
import type { InferenceModel } from './InferenceModel';
import { InferenceModelDownloader } from './InferenceModelDownloader';

// some platforms expose a dispose/release method on the session object
// the alias was previously declared inside the class but formatter kept
// mangling it; keeping it at module scope avoids style bugs while remaining
// internal to this file.
type DisposableSession = {
    dispose?: () => Promise<void> | void;
    release?: () => Promise<void> | void;
};

/**
 * OnnxRuntime – Central hub for ONNX inference and model management.
 *
 * Acts as both:
 *   1. **Low-level session manager** (load/run/release sessions)
 *   2. **Model factory & container** (creates/manages InferenceModel instances)
 *
 * Clean API:
 *   * load(capability)   ← Automatically creates & initializes model, creates session
 *   * run(capability, ...) ← Execute inference
 *   * release(capability) ← Cleanup
 *
 * Internal design:
 *   * Maintains a capability → InferenceModel mapping
 *   * Lazy-creates models on first load() call for each capability
 *   * Enforces single active session (mobile memory constraint)
 *   * Models receive OnnxRuntime instance for low-level ops
 */
export class OnnxRuntime implements InferenceModel {
    // cache the native module once per process
    private static cachedOrt: typeof Ort | null = null;

    private sessions = new Map<string, Ort.InferenceSession>();

    // Model instances (created lazily, stored for lifecycle management)
    private models = new Map<string, InferenceModel>();
    private isInitialized = false;

    // note: DisposableSession type alias lives at module scope above

    public constructor(
        private readonly logger: AppLogger = Container.get(AppLogger),
        private readonly downloader: InferenceModelDownloader = Container.get(InferenceModelDownloader),
    ) {}

    public static async ensureOrt(): Promise<typeof Ort> {
        if (OnnxRuntime.cachedOrt == null) {
            OnnxRuntime.cachedOrt = await import('onnxruntime-react-native');
        }
        return OnnxRuntime.cachedOrt;
    }

    // ──────────────────────────────────────────────────────────────
    // InferenceModel Interface Implementation (High-level lifecycle)
    // ──────────────────────────────────────────────────────────────

    /**
     * Initialize all managed models.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // For now, models initialize on first use (lazy).
            // In the future, this could eagerly initialize core models.
            this.isInitialized = true;
            this.logger.debug('[OnnxRuntime] Initialized');
        } catch (error) {
            this.logger.error('[OnnxRuntime] Failed to initialize', { error });
            throw error;
        }
    }

    /**
     * Dispose all managed models and sessions.
     */
    public async dispose(): Promise<void> {
        try {
            // Dispose all model instances
            for (const model of this.models.values()) {
                await model.dispose();
            }
            this.models.clear();

            // Release all sessions
            for (const capability of this.sessions.keys()) {
                await this.release(capability);
            }

            this.isInitialized = false;
            this.logger.debug('[OnnxRuntime] Disposed all models and sessions');
        } catch (error) {
            this.logger.error('[OnnxRuntime] Error during dispose', { error });
        }
    }

    /**
     * Check if runtime is initialized.
     */
    public async isReady(): Promise<boolean> {
        return this.isInitialized;
    }

    // ──────────────────────────────────────────────────────────────
    // Low-level Session Management (models created automatically)
    // ──────────────────────────────────────────────────────────────

    /**
     * Load a model: creates InferenceModel instance if needed, initializes it,
     * and creates an ONNX session. Safe to call multiple times.
     *
     * Usage: await onnxRuntime.load('speaker_id')
     * This automatically: creates SpeakerId model, calls initialize(), loads session
     */
    public async load(capability: string): Promise<void> {
        // Step 1: Create and initialize model if it doesn't exist
        if (!this.models.has(capability)) {
            const model = await this.createModel(capability);
            this.models.set(capability, model);
            await model.initialize();
        }

        // Step 2: Load low-level ONNX session (if not already loaded)
        if (this.sessions.has(capability)) {
            return;
        }

        // Mobile constraint: unload any existing session before loading a new one
        if (this.sessions.size > 0) {
            for (const existing of this.sessions.keys()) {
                this.sessions.delete(existing);
                this.logger.debug('[OnnxRuntime] unloaded previous session', { capability: existing });
            }
        }

        // Resolve model path via downloader
        let modelPath = this.downloader.getLocalPath(capability);
        if (!modelPath) {
            const executor = await this.downloader.download(capability);
            modelPath = this.downloader.getLocalPathForFile(executor.config, executor.config.files[0]);
        }

        if (!modelPath) {
            throw new Error(`Model for ${capability} not available`);
        }

        const ort = await OnnxRuntime.ensureOrt();
        const session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['cpu'],
        });
        this.sessions.set(capability, session);
        this.logger.debug('[OnnxRuntime] session loaded', { capability, modelPath });
    }

    /**
     * Release (dispose) the session for a capability to free memory.
     */
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
            this.logger.debug('[OnnxRuntime] session released', { capability });
        }
    }

    /**
     * Run the currently loaded model on the provided feature vector.
     * Throws if no model has been loaded yet.
     */
    public async run(capability: string, features: Float32Array, shape: readonly number[]): Promise<number[]> {
        const session = this.sessions.get(capability);
        if (!session) {
            throw new SessionNotInitializedError(`ONNX Runtime session not initialized for ${capability}`);
        }

        const inputName = session.inputNames[0];
        const outputName = session.outputNames[0];

        const ort = await OnnxRuntime.ensureOrt();
        const tensor = new ort.Tensor('float32', features, shape);
        const results = await session.run({ [inputName]: tensor });
        const outputTensor = results[outputName];
        return Array.from(outputTensor.data as Float32Array);
    }

    /**
     * Create the appropriate InferenceModel instance for a capability.
     * Uses dynamic imports to avoid circular dependencies.
     */
    private async createModel(capability: string): Promise<InferenceModel> {
        switch (capability) {
            case 'speaker_id': {
                const { SpeakerId } = await import('./InferenceModel/SpeakerId');
                return new SpeakerId(this.downloader, this, this.logger);
            }
            case 'asr': {
                const { AutomaticSpeechRecognizer } = await import('./InferenceModel/AutomaticSpeechRecognizer');
                return new AutomaticSpeechRecognizer(this.downloader, this, this.logger);
            }
            // TODO: case 'vad': { const { VoiceActivityDetector } = await import(...); ... }
            // TODO: case 'pitch': { const { PitchExtractor } = await import(...); ... }
            default:
                throw new Error(`Unknown model capability: ${capability}`);
        }
    }
}

// register for DI
Container.register(
    OnnxRuntime,
    () => new OnnxRuntime(Container.get(AppLogger), Container.get(InferenceModelDownloader)),
);
