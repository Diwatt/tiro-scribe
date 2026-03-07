/**
 * SpeakerEmbedder - ONNX session management and speaker embedding extraction
 *
 * Manages the ONNX Runtime session for speaker recognition models and extracts
 * speaker embeddings from raw PCM audio data.
 */

import type * as Ort from 'onnxruntime-react-native';
import type { ModelConfig } from '@/Api';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { InvalidAudioFormatError, SessionNotInitializedError, SpeakerVectorExtractionError } from '../../Exception';
import { AudioFeatureExtractor } from '../../Math/AudioFeatureExtractor';
import { getOnnxRuntime } from '../../Util/OnnxRuntime';
import { InferenceModelDownloader } from '../InferenceModelDownloader';
import { SpeakerVector } from './SpeakerVector';

export class SpeakerEmbedder {
    private speakerSession: Ort.InferenceSession | null = null;

    public constructor(
        private readonly audioFeatureExtractor: AudioFeatureExtractor = new AudioFeatureExtractor(),
        private readonly logger: AppLogger = Container.get(AppLogger),
    ) {}

    /**
     * Extract speaker vector from raw PCM buffer using ONNX Runtime.
     * @param pcm - Raw PCM buffer (16kHz mono, normalized to [-1,1]).
     * @returns Speaker vector with confidence score
     */
    public async extract(pcm: Float32Array): Promise<SpeakerVector> {
        if (!this.speakerSession) {
            throw new SessionNotInitializedError('SpeakerEmbedder not initialized. Call initialize() first.');
        }

        try {
            // Step 1: Extract audio features
            const AudioFeatures: Float32Array = this.audioFeatureExtractor.extract(pcm);

            // Step 2: Run inference with ONNX Runtime
            const RawEmbedding = await this.runSpeakerInference(AudioFeatures);
            const RawMagnitude = Math.sqrt(RawEmbedding.reduce((sum, v) => sum + v * v, 0));

            // Step 3: Normalize the embedding vector
            const NormalizedEmbedding = this.normalizeVector(RawEmbedding);

            // Confidence = raw vector magnitude clamped to [0, 1]
            const Confidence = Math.min(1, Math.max(0, RawMagnitude));

            return new SpeakerVector(NormalizedEmbedding, Confidence);
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
    public async initialize(modelPath: string): Promise<void> {
        try {
            const ort = await getOnnxRuntime();
            // Resolve the model path (handle both local and bundled assets)
            const ResolvedPath = await this.resolveModelPath(modelPath);

            // Load the ONNX model using ONNX Runtime
            this.speakerSession = await ort.InferenceSession.create(ResolvedPath, {
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
        for (const File of config.files) {
            const Filename = File.url.substring(File.url.lastIndexOf('/') + 1);
            if (Filename.toLowerCase().endsWith('.onnx')) {
                return File.url;
            }
        }

        // Fallback to first file
        return config.files[0].url;
    }

    /**
     * Normalize a vector to unit length
     */
    private normalizeVector(vector: number[]): number[] {
        const Magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (Magnitude === 0) {
            return vector;
        }
        return vector.map((v) => v / Magnitude);
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
        const Config = await Container.get(InferenceModelDownloader).getConfigByLocalPath(modelPath);
        if (Config != null) {
            const Executor = await Container.get(InferenceModelDownloader).download(Config.capability);
            // Get the URI from the config through the executor's config property
            return this.getModelUriFromConfig(Executor.config);
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

        const InputName = this.speakerSession.inputNames[0];
        const OutputName = this.speakerSession.outputNames[0];

        const NMels = 80;
        const TimeFrames = Math.ceil(features.length / NMels);
        const InputShape: readonly number[] = [1, NMels, TimeFrames];

        const Total = InputShape.reduce((a, b) => a * b, 1);
        const Buffer = new Float32Array(Total);
        Buffer.set(features.subarray(0, Total));

        const ort = await getOnnxRuntime();
        const Tensor = new ort.Tensor('float32', Buffer, InputShape);
        const Results = await this.speakerSession.run({ [InputName]: Tensor });
        const OutputTensor = Results[OutputName];
        return Array.from(OutputTensor.data as Float32Array);
    }
}

// Register with Container for production use

Container.register(
    SpeakerEmbedder,
    () => new SpeakerEmbedder(new AudioFeatureExtractor(), Container.get(AppLogger)),
);
