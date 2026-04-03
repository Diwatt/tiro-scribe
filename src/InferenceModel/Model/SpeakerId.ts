/**
 * SpeakerId – CAM++ Speaker Recognition Model Wrapper
 *
 * Manages the CAM++ ONNX model for extracting speaker embeddings.
 *
 * Responsibilities:
 *   * Load CAM++ ONNX session
 *   * Parse config.yaml
 *   * Execute inference on mel-spectrogram features
 *
 * Design: This class manages the model only.
 * Audio preprocessing (PCM → mel features) is handled by callers.
 *
 * Typical usage flow:
 *   1. Caller extracts mel-spectrogram via AudioFeatureExtractor
 *   2. Caller calls model.run(features, shape)
 *   3. Caller normalizes output embedding to unit length
 */

import type { AppLogger } from '@/Core/AppLogger';
import { Downloader } from '../Downloader';
import { Runtime } from '../Runtime';
import type { InferenceModel } from './InferenceModel';

export interface SpeakerIdConfig {
    // CAM++ model configuration (to be parsed from config.yaml)
    embeddingDim?: number;
    numMelBins?: number;
}

export class SpeakerId implements InferenceModel<[Float32Array, readonly number[]], number[]> {
    private readonly capability = 'speaker_id';
    private isInitialized = false;

    // Loaded config
    private config: SpeakerIdConfig | null = null;

    public constructor(
        private readonly downloader: Downloader,
        private readonly runtime: Runtime,
        private readonly logger: AppLogger,
    ) {}

    /**
     * Initialize: download CAM++ ONNX and config files
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Step 1: Download model files
            const executor = await this.downloader.download(this.capability);

            // Step 2: Parse config
            // TODO: Load and parse config.yaml
            this.loadConfig(executor.config);

            this.isInitialized = true;
            this.logger.debug('[SpeakerId] Model initialized');
        } catch (error) {
            this.logger.error('[SpeakerId] Failed to initialize', { error });
            throw error;
        }
    }

    /**
     * Release the model session
     */
    public async dispose(): Promise<void> {
        try {
            await this.runtime.release(this.capability);
            this.isInitialized = false;
            this.logger.debug('[SpeakerId] Model disposed');
        } catch (error) {
            this.logger.error('[SpeakerId] Error during dispose', { error });
        }
    }

    /**
     * Check if model is ready
     */
    public async isReady(): Promise<boolean> {
        return this.isInitialized;
    }

    /**
     * Extract speaker embedding from mel-spectrogram features
     * @param features - Mel-spectrogram features (preprocessed by caller)
     * @returns Raw speaker embedding vector (caller normalizes to unit length)
     */
    public async run(features: Float32Array): Promise<number[]> {
        if (!this.isInitialized) {
            throw new Error('SpeakerId model not initialized. Call initialize() first.');
        }

        try {
            // CAM++ expects input shaped as [1, timeFrames, nMels]
            const nMels = this.config?.numMelBins ?? 80;
            const timeFrames = Math.floor(features.length / nMels);
            if (timeFrames === 0) {
                throw new Error('Feature vector contains no complete frames');
            }

            const inputShape: readonly number[] = [1, timeFrames, nMels];
            const buffer = features.subarray(0, nMels * timeFrames);

            // Load model session
            await this.runtime.load(this.capability);

            // Execute inference
            return await this.runtime.runRaw(this.capability, buffer, inputShape);
        } catch (error) {
            this.logger.error('[SpeakerId] Inference failed', { error });
            throw error;
        }
    }

    /**
     * Load config from downloaded model metadata
     */
    private loadConfig(_config: unknown): void {
        // TODO: Parse config.yaml from model files
        // For now, set reasonable defaults for CAM++
        this.config = {
            embeddingDim: 192,
            numMelBins: 80,
        };
        this.logger.debug('[SpeakerId] Config loaded', { config: this.config });
    }
}
