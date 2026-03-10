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
// needed for fallback when callers pass a relative path (e.g. "artifacts/..." )
import { File, Paths } from 'expo-file-system';


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
        // Absolute paths or file URIs bypass downloader entirely
        if (modelPath.startsWith('file://') || modelPath.startsWith('/')) {
            return modelPath;
        }

        // If the path is relative (e.g. "artifacts/.."), convert it to a
        // full URI by resolving against the document directory.  Previously we
        // only returned the value if the file actually existed, but race
        // conditions and filesystem quirks can make `exists` return `false` even
        // though the file is perfectly valid once passed to native APIs.  To
        // avoid throwing a confusing error we always compute the candidate URI
        // and only use the existence check as a fast‑path.
        const relativeSegments = modelPath.split('/');
        const candidateFile = new File(Paths.document, ...relativeSegments);
        const candidateUri = candidateFile.uri;
        if (candidateFile.exists) {
            return candidateUri;
        }
        // otherwise fall through to config resolution, but if that also fails
        // we'll still return candidateUri at the end instead of throwing.

        // Otherwise, ask the inferenceDownloader for a config and download if needed
        const Config = await Container.get(InferenceModelDownloader).getConfigByLocalPath(modelPath);
        if (Config != null) {
            const Executor = await Container.get(InferenceModelDownloader).download(Config.capability);
            // Get the URI from the config through the executor's config property
            return this.getModelUriFromConfig(Executor.config);
        }

        // Fallback: we were unable to resolve the model via the downloader; return
        // the candidate document‑relative URI anyway and let the caller (usually
        // ONNX Runtime) report the error.  This avoids the confusing
        // "Model not found at artifacts/..." message and gives more context in
        // the underlying filesystem error if the file truly is missing.
        return candidateUri;
    }

    /**
     * Load and initialize a model by capability name (e.g. 'speaker_id').
     *
     * This method centralizes the download/lookup logic so callers such as
     * VoiceCalibrator don't need to know about InferenceModelDownloader.
     * If the embedder is already initialized the call is a no-op.
     */
    public async loadModel(capability: string): Promise<void> {
        if (this.speakerSession) {
            return;
        }

        const downloader = Container.get(InferenceModelDownloader);
        // attempt to resolve path; download if missing
        let modelPath = downloader.getLocalPath(capability);
        if (!modelPath) {
            const executor = await downloader.download(capability);
            modelPath = downloader.getLocalPathForFile(executor.config, executor.config.files[0]);
        }

        if (!modelPath) {
            throw new InvalidAudioFormatError(`Model for ${capability} not available`);
        }

        await this.initialize(modelPath);
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

        // Determine the expected input dimensions from the session metadata if
        // available.  ONNX models exported for speaker recognition often have a
        // fixed time dimension (e.g. `[1,80,80]`), but some may leave it
        // symbolic for dynamic-length audio.  We use defaults as a fallback so
        // that the logic remains safe even when metadata isn't provided (e.g.
        // during unit tests).
        let NMels = 80;
        let expectedTimeFrames: number | null = null;
        if (this.speakerSession.inputMetadata && this.speakerSession.inputMetadata.length > 0) {
            const meta = this.speakerSession.inputMetadata[0];
            if (meta.isTensor && meta.shape.length >= 3) {
                const dim1 = meta.shape[1];
                const dim2 = meta.shape[2];
                if (typeof dim1 === 'number') {
                    NMels = dim1;
                }
                if (typeof dim2 === 'number') {
                    expectedTimeFrames = dim2;
                }
            }
        }

        const rawTimeFrames = Math.ceil(features.length / NMels);
        let TimeFrames = rawTimeFrames;

        if (expectedTimeFrames !== null) {
            // if the model expects a fixed number of time frames, make sure the
            // buffer we feed into ONNX matches that shape.  This prevents the
            // "Got invalid dimensions" runtime error seen when a short recording
            // only produced 37 frames instead of the required 80.
            if (rawTimeFrames < expectedTimeFrames) {
                this.logger.warn(
                    '[SpeakerEmbedder] feature vector contained only %d frames, padding to %d',
                    rawTimeFrames,
                    expectedTimeFrames,
                );
                TimeFrames = expectedTimeFrames;
            } else if (rawTimeFrames > expectedTimeFrames) {
                this.logger.debug(
                    '[SpeakerEmbedder] feature vector has %d frames, truncating to %d',
                    rawTimeFrames,
                    expectedTimeFrames,
                );
                TimeFrames = expectedTimeFrames;
            }
        }
        // if expectedTimeFrames is null the model is dynamic on the time
        // dimension; we'll just use rawTimeFrames and let the session accept it.

        const InputShape: readonly number[] = [1, NMels, TimeFrames];

        const Total = NMels * TimeFrames;
        const Buffer = new Float32Array(Total);
        // copy up to the amount we'll actually feed the model; remaining slots
        // stay zero which corresponds to silence
        Buffer.set(features.subarray(0, Math.min(features.length, Total)));

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
