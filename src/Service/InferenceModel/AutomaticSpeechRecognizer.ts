/**
 * AutomaticSpeechRecognizer (ASR) – Whisper Model Wrapper
 *
 * Manages Whisper encoder + decoder ONNX models for speech-to-text.
 *
 * Responsibilities:
 *   * Load encoder and decoder ONNX sessions
 *   * Parse tokenizer.json and preprocessor_config.json
 *   * Execute encoder → decoder → text decoding pipeline
 *
 * Design: This class manages sessions and inference only.
 * Audio preprocessing (PCM → log-mel) is handled by callers.
 *
 * Constraint: Both encoder and decoder must be in memory simultaneously.
 */

import type { AppLogger } from '@/Core/AppLogger';
import type { InferenceModelDownloader } from '../InferenceModelDownloader';
import type { OnnxRuntime } from '../OnnxRuntime';
import type { InferenceModel } from './InferenceModel';

export interface AsrConfig {
    // Whisper preprocessing parameters (normalized to camelCase from model config)
    nFft?: number;
    nMels?: number;
    nSamples?: number;
    sampleRate?: number;
    hopLength?: number;
    chunkLength?: number;
    numMelBins?: number;
}

// Simplified tokenizer type; real implementation would parse tokenizer.json
// and provide token→text decoding functionality.
export type AsrTokenizer = Record<string, never>;

export class AutomaticSpeechRecognizer implements InferenceModel<[Float32Array, readonly number[]], string> {
    private encoderSessionCapability = 'asr_encoder';
    private decoderSessionCapability = 'asr_decoder';
    private isInitialized = false;

    // Loaded config
    private config: AsrConfig | null = null;

    public constructor(
        private readonly downloader: InferenceModelDownloader,
        private readonly runtime: OnnxRuntime,
        private readonly logger: AppLogger,
    ) {}

    /**
     * Initialize: download encoder + decoder + tokenizer + preprocessor config
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Step 1: Download ASR model files (contains both encoder and decoder)
            const executor = await this.downloader.download('asr');
            const { files } = executor.config;

            if (files.length < 2) {
                throw new Error('ASR model requires at least encoder + decoder ONNX files');
            }

            // TODO: Parse tokenizer.json and preprocessor_config.json from executor.config
            // For now, store the config path for later use
            this.loadConfig(executor.config);

            // Step 2: Load encoder and decoder sessions
            // The encoder is typically files[0], decoder is files[1]
            const encoderPath = this.downloader.getLocalPathForFile(executor.config, files[0]);
            const decoderPath = this.downloader.getLocalPathForFile(executor.config, files[1]);

            if (!encoderPath || !decoderPath) {
                throw new Error('Failed to resolve encoder or decoder paths');
            }

            // Since OnnxRuntime enforces single-session constraint,
            // we need to load encoder, run it, then load decoder for usage.
            // For now, mark as initialized; actual session loading happens on-demand.
            this.isInitialized = true;
            this.logger.debug('[ASR] Model initialized', { encoderPath, decoderPath });
        } catch (error) {
            this.logger.error('[ASR] Failed to initialize', { error });
            throw error;
        }
    }

    /**
     * Release both encoder and decoder sessions
     */
    public async dispose(): Promise<void> {
        try {
            await this.runtime.release(this.encoderSessionCapability);
            await this.runtime.release(this.decoderSessionCapability);
            this.isInitialized = false;
            this.logger.debug('[ASR] Model disposed');
        } catch (error) {
            this.logger.error('[ASR] Error during dispose', { error });
        }
    }

    /**
     * Check if model is ready (both encoder and decoder available)
     */
    public async isReady(): Promise<boolean> {
        return this.isInitialized;
    }

    /**
     * Run inference on preprocessed log-mel spectrogram features
     * @param logMelSpec - Log-mel spectrogram (preprocessing handled by caller)
     * @param shape - Tensor shape [batch, nMels, timeFrames]
     * @returns Transcribed text
     *
     * Note: Callers (e.g., transcription service) handle:
     *   * PCM → log-mel conversion via AudioFeatureExtractor
     *   * Token decoding via tokenizer.json
     */
    public async run(_logMelSpec: Float32Array, _shape: readonly number[]): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('ASR model not initialized. Call initialize() first.');
        }

        try {
            // Step 1: Load encoder and run inference
            await this.runtime.load(this.encoderSessionCapability);
            // TODO: const encoderOutput = await this.runtime.run(this.encoderSessionCapability, _logMelSpec, _shape)

            // Step 2: Load decoder and run inference
            await this.runtime.load(this.decoderSessionCapability);
            // TODO: const decoderOutput = await this.runtime.run(this.decoderSessionCapability, ...)

            // Step 3: Decode tokens to text
            // TODO: return this.decodeTokens(decoderOutput);
            return 'TODO: implement full transcription pipeline';
        } catch (error) {
            this.logger.error('[ASR] Inference failed', { error });
            throw error;
        }
    }

    /**
     * Load preprocessor config from downloaded model
     */
    private loadConfig(_config: unknown): void {
        // TODO: Parse config.json and preprocessor_config.json from model files
        // For now, set reasonable defaults for Whisper Medium
        this.config = {
            nFft: 400,
            nMels: 80,
            nSamples: 480_000, // 30 seconds at 16kHz
            sampleRate: 16_000,
            hopLength: 160,
            chunkLength: 30,
            numMelBins: 80,
        };
        this.logger.debug('[ASR] Config loaded', { config: this.config });
    }
}
