/**
 * SpeakerEmbedder – Speaker Embedding Extraction Service
 *
 * Composes:
 *   * AudioFeatureExtractor – PCM → mel spectrogram preprocessing
 *   * SpeakerId model – CAM++ inference
 *   * Vector normalization – unit-length embedding output
 *
 * Responsibilities:
 *   * Initialize the SpeakerId model on first use
 *   * Extract mel-spectrogram features from raw PCM
 *   * Execute speaker embedding inference
 *   * Normalize embeddings and compute confidence scores
 *   * Release model resources on cleanup
 */

import { Container } from '@/Core/Container';
import { SpeakerVectorExtractionError } from '../../Exception';
import { AudioFeatureExtractor } from '../../Math/AudioFeatureExtractor';
import { OnnxRuntime } from '../OnnxRuntime';

import { SpeakerVector } from './SpeakerVector';

export class SpeakerEmbedder {
    private initialized = false;

    public constructor(
        private readonly audioFeatureExtractor: AudioFeatureExtractor = new AudioFeatureExtractor(),
        private readonly onnxRuntime: OnnxRuntime = Container.get(OnnxRuntime),
    ) {}

    /**
     * Extract speaker vector from raw PCM buffer.
     * @param pcm - Raw PCM buffer (16kHz mono, normalized to [-1,1]).
     * @returns Speaker vector with confidence score
     */
    public async extract(pcm: Float32Array): Promise<SpeakerVector> {
        try {
            // Ensure model is initialized
            await this.ensureInitialized();

            // Step 1: Extract audio features (PCM → mel spectrogram)
            const audioFeatures: Float32Array = this.audioFeatureExtractor.extract(pcm);

            // Step 2: Run inference with speaker_id model via low-level OnnxRuntime API
            const rawEmbedding = await this.runSpeakerInference(audioFeatures);
            const rawMagnitude = Math.sqrt(rawEmbedding.reduce((sum, v) => sum + v * v, 0));

            // Step 3: Normalize the embedding vector
            const normalizedEmbedding = this.normalizeVector(rawEmbedding);

            // Confidence = raw vector magnitude clamped to [0, 1]
            const confidence = Math.min(1, Math.max(0, rawMagnitude));

            return new SpeakerVector(normalizedEmbedding, confidence);
        } catch (error) {
            throw new SpeakerVectorExtractionError(
                `Failed to extract speaker vector: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Release model resources.
     */
    public async dispose(): Promise<void> {
        if (this.initialized) {
            await this.onnxRuntime.dispose();
            this.initialized = false;
        }
    }

    /**
     * Initialize the speaker_id model on first use.
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            // load() automatically creates SpeakerId model, initializes it, and loads session
            await this.onnxRuntime.load('speaker_id');
            this.initialized = true;
        }
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
     * Run speaker recognition inference with CAM++ model
     */
    private async runSpeakerInference(features: Float32Array): Promise<number[]> {
        // CAM++ expects a [1, 80, TimeFrames] tensor.
        // The embedder owns this tensor shape logic because callers work
        // with audio features from AudioFeatureExtractor.
        const nMels = 80;
        const timeFrames = Math.floor(features.length / nMels);
        if (timeFrames === 0) {
            throw new SpeakerVectorExtractionError('Feature vector contains no complete frames');
        }

        const inputShape: readonly number[] = [1, nMels, timeFrames];
        const buffer = features.subarray(0, nMels * timeFrames);

        // Use low-level OnnxRuntime API to load and run speaker_id model
        await this.onnxRuntime.load('speaker_id');
        return this.onnxRuntime.run('speaker_id', buffer, inputShape);
    }
}

// Register with Container for production use
Container.register(SpeakerEmbedder, () => new SpeakerEmbedder(new AudioFeatureExtractor(), Container.get(OnnxRuntime)));
