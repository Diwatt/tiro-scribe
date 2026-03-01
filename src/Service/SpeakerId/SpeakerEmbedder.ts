/**
 * SpeakerEmbedder - ONNX session management and speaker embedding extraction
 *
 * Manages the ONNX Runtime session for speaker recognition models and extracts
 * speaker embeddings from raw PCM audio data.
 */

import type { ModelConfig } from '@/Api';
import { InvalidAudioFormatError, SessionNotInitializedError, SpeakerVectorExtractionError } from '../../Exception';
import { AudioFeatureExtractor } from '../../Math/AudioFeatureExtractor';
import { getOnnxRuntime } from '../../Util/OnnxRuntime';
import { inferenceModelDownloader } from '../InferenceModelDownloader';
import { appLogger, type LoggerInterface } from '../Logger';
import { SpeakerVector } from './SpeakerVector';

export class SpeakerEmbedder {
    private readonly audioFeatureExtractor: AudioFeatureExtractor;
    private readonly logger: LoggerInterface;
    private speakerSession: any | null = null;

    /**
     * @param audioFeatureExtractor - audio feature extraction utility
     * @param logger - optional logger instance
     */
    constructor(
        audioFeatureExtractor: AudioFeatureExtractor = new AudioFeatureExtractor(),
        logger: LoggerInterface = appLogger,
    ) {
        this.audioFeatureExtractor = audioFeatureExtractor;
        this.logger = logger;
    }

    /**
     * Extract speaker vector from raw PCM buffer using ONNX Runtime.
     * @param pcm - Raw PCM buffer (16kHz mono, normalized to [-1,1]).
     * @returns Speaker vector with confidence score
     */
    async extract(pcm: Float32Array): Promise<SpeakerVector> {
        if (!this.speakerSession) {
            throw new SessionNotInitializedError('SpeakerEmbedder not initialized. Call initialize() first.');
        }

        try {
            // Step 1: Extract audio features
            const audioFeatures: Float32Array = this.audioFeatureExtractor.extract(pcm);

            // Step 2: Run inference with ONNX Runtime
            const embedding = await this.runSpeakerInference(audioFeatures);

            // Step 3: Normalize the embedding vector
            const normalizedEmbedding = this.normalizeVector(embedding);

            // Confidence = vector magnitude (clamped to 1)
            const confidence = Math.min(1.0, Math.sqrt(normalizedEmbedding.reduce((sum, val) => sum + val * val, 0)));

            return new SpeakerVector(normalizedEmbedding, confidence);
        } catch (error) {
            throw new SpeakerVectorExtractionError(
                `Failed to extract speaker vector: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Initialize the SpeakerEmbedder with ONNX Runtime and speaker recognition model
     * @param modelPath - Path to the Sherpa-ONNX speaker recognition model (.onnx file)
     */
    async initialize(modelPath: string): Promise<void> {
        try {
            const ort = await getOnnxRuntime();
            // Resolve the model path (handle both local and bundled assets)
            const resolvedPath = await this.resolveModelPath(modelPath);

            // Load the ONNX model using ONNX Runtime
            this.speakerSession = await ort.InferenceSession.create(resolvedPath, {
                executionProviders: ['cpu'], // Use CPU execution provider
            });

            this.logger.info('SpeakerEmbedder initialized successfully');
        } catch (error) {
            throw new InvalidAudioFormatError(
                `Failed to initialize speaker recognition model: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Get model URI from config - inline logic to avoid DI violation
     */
    private getModelUriFromConfig(config: ModelConfig): string {
        if (config.files.length === 0) {
            throw new InvalidAudioFormatError(`Model configuration ${config.capability} (${config.id}) has no files`);
        }

        // Try to find a file with .onnx extension
        for (const file of config.files) {
            const filename = file.url.substring(file.url.lastIndexOf('/') + 1);
            if (filename.toLowerCase().endsWith('.onnx')) {
                return file.url;
            }
        }

        // Fallback to first file
        return config.files[0].url;
    }

    /**
     * Normalize a vector to unit length
     */
    private normalizeVector(vector: number[]): number[] {
        const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (magnitude === 0) {
            return vector;
        }
        return vector.map((v) => v / magnitude);
    }

    /**
     * Resolve model path - downloads model if needed
     */
    private async resolveModelPath(modelPath: string): Promise<string> {
        // Absolute paths or file URIs bypass downloader
        if (modelPath.startsWith('file://') || modelPath.startsWith('/')) {
            return modelPath;
        }

        // Otherwise, ask the inferenceDownloader for a config and download if needed
        const config = await inferenceModelDownloader.getConfigByLocalPath(modelPath);
        if (config != null) {
            const executor = await inferenceModelDownloader.download(config.capability);
            // Get the URI from the config through the executor's config property
            return this.getModelUriFromConfig(executor.config);
        }

        throw new InvalidAudioFormatError(
            `Model not found at ${modelPath}. Please ensure the model is downloaded or provide a valid model URL.`,
        );
    }

    /**
     * Run speaker recognition inference using ONNX Runtime
     */
    private async runSpeakerInference(features: Float32Array): Promise<number[]> {
        if (!this.speakerSession) {
            throw new SessionNotInitializedError();
        }

        const inputName = this.speakerSession.inputNames[0];
        const outputName = this.speakerSession.outputNames[0];

        const nMels = 80;
        const timeFrames = Math.ceil(features.length / nMels);
        const inputShape: readonly number[] = [1, nMels, timeFrames];

        const total = inputShape.reduce((a, b) => a * b, 1);
        const buffer = new Float32Array(total);
        buffer.set(features.subarray(0, total));

        const ort = await getOnnxRuntime();
        const tensor = new ort.Tensor('float32', buffer, inputShape);
        const results = await this.speakerSession.run({ [inputName]: tensor });
        const outputTensor = results[outputName];
        return Array.from(outputTensor.data as Float32Array);
    }
}

// Module-level convenience instance
export const speakerEmbedder = new SpeakerEmbedder();
