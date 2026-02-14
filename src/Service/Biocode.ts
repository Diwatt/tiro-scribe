/**
 * Biocode - Voice Identity & Vector Projection
 *
 * Implements the biocoding protocol:
 * 1. Extract speaker vector using sherpa-onnx
 * 2. Project vector using therapist's password-derived projection matrix
 * 3. Store projected vector for matching while preventing reverse engineering
 */

import { File, Paths } from 'expo-file-system';
import type * as Ort from 'onnxruntime-react-native';
import QuickCrypto from 'react-native-quick-crypto';

/** Lazy-loaded ONNX Runtime; avoids loading native module until Biocode actually needs it. */
let ortModule: typeof Ort | null = null;
async function getOrt(): Promise<typeof Ort> {
    if (ortModule == null) {
        ortModule = await import('onnxruntime-react-native');
    }
    return ortModule;
}

import type { BiocodeResult, SpeakerVector, Therapist } from '@/Entity';
import {
    InvalidAudioFormatError,
    InvalidDimensionError,
    SessionNotInitializedError,
    SpeakerVectorExtractionError,
    VectorLengthMismatchError,
} from '../Exception';
import { masterKeyVault } from '../Security/MasterKeyVault';
import { AppLogger, type LoggerInterface } from './Logger';

/**
 * Biocode constants for LCG algorithm and vector dimensions
 */
const BIocode = {
    DEFAULT_INPUT_DIM: 192,
    DEFAULT_OUTPUT_DIM: 128,
    LCG_MULTIPLIER: 1664525,
    LCG_INCREMENT: 1013904223,
    LCG_MODULUS: 2 ** 32,
    LCG_NORMALIZE_MULTIPLIER: 2,
    LCG_NORMALIZE_SUBTRACT: 1,
} as const;

/**
 * Projected vector result
 */
export interface ProjectedVector {
    vector: number[];
    confidence: number;
}

export class Biocode {
    private speakerSession: Ort.InferenceSession | null = null;
    private projectionMatrix: number[][] | null = null;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.loggerInstance = logger;
    }

    /**
     * Initialize the Biocode with ONNX Runtime and speaker recognition model
     * @param modelPath - Path to the Sherpa-ONNX speaker recognition model (.onnx file)
     */
    async initialize(modelPath: string): Promise<void> {
        try {
            const ort = await getOrt();
            // Resolve the model path (handle both local and bundled assets)
            const resolvedPath = await this.resolveModelPath(modelPath);

            // Load the ONNX model using ONNX Runtime
            this.speakerSession = await ort.InferenceSession.create(resolvedPath, {
                executionProviders: ['cpu'], // Use CPU execution provider
            });

            this.modelPath = resolvedPath;
        } catch (error) {
            throw new InvalidAudioFormatError(
                `Failed to initialize speaker recognition model: ${error}`,
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Resolve model path - downloads model if needed
     */
    private async resolveModelPath(modelPath: string): Promise<string> {
        // If it's already an absolute path or starts with file://, use it directly
        if (modelPath.startsWith('file://') || modelPath.startsWith('/')) {
            return modelPath;
        }

        // Check if file exists in document directory (for downloaded models)
        const pathParts = modelPath.split('/').filter(Boolean);
        if (pathParts.length > 0) {
            const file = new File(Paths.document, ...pathParts);
            if (file.exists) {
                return file.uri;
            }
        }

        // Try to resolve via taxonomy/default configs (by localPath)
        const { ModelDownloader } = await import('./ModelDownloader');
        const downloader = ModelDownloader.getInstance();
        const config = await downloader.getConfigByLocalPath(modelPath);
        if (config != null) {
            return await downloader.ensureDownloaded(config);
        }

        throw new InvalidAudioFormatError(`Model not found at ${modelPath}. Please ensure the model is downloaded or provide a valid model URL.`);
    }

    /**
     * Set therapist and load projection key from SecureStore.
     * Call after therapist has been unlocked (login/restore). Projection key = master key.
     *
     * @param therapist - Therapist instance (must have master key in SecureStore)
     */
    async setTherapistCredentials(therapist: Therapist): Promise<void> {
        this.therapistUuid = therapist.primaryKey;
        const projectionKey = await masterKeyVault.load(therapist.uuid);
        this.projectionMatrix = this.generateProjectionMatrix(projectionKey);
    }

    /**
     * Generate a deterministic projection matrix from a key
     * Uses the key as a seed for a pseudo-random number generator
     * @param key - Projection key (derived from password)
     * @param inputDim - Input vector dimension (default: 192, typical for speaker vectors)
     * @param outputDim - Output vector dimension (default: 128, reduced for privacy)
     * @returns Projection matrix [outputDim x inputDim]
     */
    private generateProjectionMatrix(key: string, inputDim: number = BIocode.DEFAULT_INPUT_DIM, outputDim: number = BIocode.DEFAULT_OUTPUT_DIM): number[][] {
        // Use key to seed a deterministic RNG
        const seed = this.hashToNumber(key);
        const matrix: number[][] = [];

        // Simple LCG (Linear Congruential Generator) for deterministic randomness
        let state = seed;
        const a = BIocode.LCG_MULTIPLIER;
        const c = BIocode.LCG_INCREMENT;
        const m = BIocode.LCG_MODULUS;

        for (let i = 0; i < outputDim; i++) {
            matrix[i] = [];
            for (let j = 0; j < inputDim; j++) {
                state = (a * state + c) % m;
                // Normalize to [-1, 1] range
                const value = (state / m) * BIocode.LCG_NORMALIZE_MULTIPLIER - BIocode.LCG_NORMALIZE_SUBTRACT;
                matrix[i][j] = value;
            }
        }

        // Orthonormalize the matrix to preserve distances better
        return this.orthonormalize(matrix);
    }

    /**
     * Convert hash string to a number seed
     */
    private hashToNumber(key: string): number {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Orthonormalize matrix using Gram-Schmidt process
     * This helps preserve distance relationships in the projected space
     */
    private orthonormalize(matrix: number[][]): number[][] {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const orthonormal: number[][] = [];

        for (let i = 0; i < rows; i++) {
            const v = [...matrix[i]];

            // Subtract projections onto previous vectors
            for (let j = 0; j < i; j++) {
                const dot = this.dotProduct(v, orthonormal[j]);
                for (let k = 0; k < cols; k++) {
                    v[k] -= dot * orthonormal[j][k];
                }
            }

            // Normalize
            const norm = Math.sqrt(this.dotProduct(v, v));
            if (norm > 0.0001) {
                for (let k = 0; k < cols; k++) {
                    v[k] /= norm;
                }
            }

            orthonormal.push(v);
        }
        return orthonormal;
    }

    /**
     * Calculate dot product of two vectors
     */
    private dotProduct(v1: number[], v2: number[]): number {
        let sum = 0;
        for (let i = 0; i < v1.length; i++) {
            sum += v1[i] * v2[i];
        }
        return sum;
    }

    /**
     * Project a vector using the projection matrix
     * @param vector - Original vector to project
     * @returns Projected vector
     */
    private applyProjection(vector: number[]): number[] {
        if (!this.projectionMatrix) {
            throw new SessionNotInitializedError('Projection matrix not set. Call setTherapistCredentials() first.');
        }

        const outputDim = this.projectionMatrix.length;
        const inputDim = vector.length;

        if (this.projectionMatrix[0].length !== inputDim) {
            throw new InvalidDimensionError(`Vector dimension ${inputDim} does not match projection matrix input dimension ${this.projectionMatrix[0].length}`);
        }

        const projected: number[] = [];

        for (let i = 0; i < outputDim; i++) {
            let sum = 0;
            for (let j = 0; j < inputDim; j++) {
                sum += this.projectionMatrix[i][j] * vector[j];
            }
            projected.push(sum);
        }
        return projected;
    }

    /**
     * Extract speaker vector from audio file using ONNX Runtime
     * @param audioPath - Path to the audio file
     * @returns Speaker vector with confidence score
     */
    async extractSpeakerVector(audioPath: string): Promise<SpeakerVector> {
        if (!this.speakerSession) {
            throw new SessionNotInitializedError('Biocode not initialized. Call initialize() first.');
        }

        try {
            // Step 1: Load and preprocess audio
            const audioFeatures = await this.preprocessAudio(audioPath);

            // Step 2: Run inference with ONNX Runtime
            const embedding = await this.runSpeakerInference(audioFeatures);

            // Step 3: Normalize the embedding vector
            const normalizedEmbedding = this.normalizeVector(embedding);

            // Calculate confidence based on vector magnitude
            const confidence = Math.min(1.0, Math.sqrt(normalizedEmbedding.reduce((sum, val) => sum + val * val, 0)));
            return {
                vector: normalizedEmbedding,
                confidence,
            };
        } catch (error) {
            throw new SpeakerVectorExtractionError(`Failed to extract speaker vector: ${error}`, error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Preprocess audio file to extract features (mel spectrogram)
     * This is a simplified version - you may need to use a native audio processing library
     * or implement proper mel spectrogram extraction
     */
    private async preprocessAudio(_audioPath: string): Promise<Float32Array> {
        // TODO: Implement proper audio preprocessing
        // For now, this is a placeholder. You'll need to:
        // 1. Load audio file (WAV format, 16kHz, mono)
        // 2. Convert to mel spectrogram features
        // 3. Return as Float32Array with shape [batch, time, features]

        // Placeholder: Return dummy features
        // In production, use a library like:
        // - expo-audio for loading audio
        // - A native module for mel spectrogram extraction
        // - Or use Sherpa-ONNX's preprocessing utilities

        throw new InvalidAudioFormatError('Audio preprocessing not implemented. You need to implement mel spectrogram extraction.');
    }

    /**
     * Run speaker recognition inference using ONNX Runtime
     */
    private async runSpeakerInference(features: Float32Array): Promise<number[]> {
        if (!this.speakerSession) {
            throw new SessionNotInitializedError();
        }

        // Get model input/output names
        const inputName = this.speakerSession.inputNames[0];
        const outputName = this.speakerSession.outputNames[0];

        // Get input shape from model metadata
        // Use a default shape - actual shape will be determined by the model
        // You may need to adjust this based on your specific model
        const inputShape: readonly number[] = [1, 80, 100]; // Default: [batch, mel_bins, time_frames]

        // Reshape features to match model input shape
        // Typical shape: [batch, time_frames, mel_bins] or [batch, features]
        const reshapedFeatures = this.reshapeFeatures(features, inputShape);

        // Create input tensor
        const ort = await getOrt();
        const tensor = new ort.Tensor('float32', reshapedFeatures, inputShape);

        // Run inference
        const results = await this.speakerSession.run({
            [inputName]: tensor,
        });

        // Extract embedding from output
        const outputTensor = results[outputName];
        const embedding = Array.from(outputTensor.data as Float32Array);
        return embedding;
    }

    /**
     * Reshape features array to match model input shape
     */
    private reshapeFeatures(features: Float32Array, targetShape: readonly number[]): Float32Array {
        // Calculate total elements
        const totalElements = targetShape.reduce((a, b) => a * b, 1);

        // If features don't match, pad or truncate
        if (features.length < totalElements) {
            // Pad with zeros
            const padded = new Float32Array(totalElements);
            padded.set(features);
            return padded;
        } else if (features.length > totalElements) {
            // Truncate
            return features.slice(0, totalElements);
        }
        return features;
    }

    /**
     * Normalize vector to unit length (L2 normalization)
     */
    private normalizeVector(vector: number[]): number[] {
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

        if (magnitude === 0) {
            return vector;
        }
        return vector.map((val) => val / magnitude);
    }

    /**
     * Calculate cosine similarity between two speaker vectors
     * @param vector1 - First speaker vector
     * @param vector2 - Second speaker vector
     * @returns Cosine similarity score (0-1)
     */
    async calculateCosineSimilarity(vector1: number[], vector2: number[]): Promise<number> {
        if (vector1.length !== vector2.length) {
            throw new VectorLengthMismatchError();
        }

        // Calculate cosine similarity manually
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            magnitude1 += vector1[i] * vector1[i];
            magnitude2 += vector2[i] * vector2[i];
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        return dotProduct / (magnitude1 * magnitude2);
    }

    /**
     * Project speaker vector using therapist's projection matrix
     * The projected vector preserves distance relationships for matching
     * while preventing reverse engineering of the original vector
     * @param speakerVector - The extracted speaker vector
     * @returns Projected vector result
     */
    projectVector(speakerVector: SpeakerVector): ProjectedVector {
        if (!this.projectionMatrix) {
            throw new SessionNotInitializedError('Projection matrix not set. Call setTherapistCredentials() first.');
        }

        const projected = this.applyProjection(speakerVector.vector);
        return {
            vector: projected,
            confidence: speakerVector.confidence,
        };
    }

    /**
     * Generate patient biocode from projected vector
     * Uses the projected vector (not original) to generate a deterministic ID
     * @param speakerVector - The extracted speaker vector
     * @returns Biocode result with patient ID from projected vector
     */
    async generateBiocode(speakerVector: SpeakerVector): Promise<BiocodeResult> {
        if (!this.projectionMatrix) {
            throw new SessionNotInitializedError('Projection matrix not set. Call setTherapistCredentials() first.');
        }

        // Project the vector
        const projected = this.applyProjection(speakerVector.vector);

        // Generate deterministic biocode from projected vector
        // This ensures same voice always produces same biocode
        const vectorString = projected.join(',');
        const biocode = QuickCrypto.createHash('sha256').update(vectorString).digest().toString('hex');
        return {
            biocode,
            confidence: speakerVector.confidence,
            timestamp: Date.now(),
        };
    }

    /**
     * Process audio file and generate biocode
     * @param audioPath - Path to the audio file
     * @returns Biocode result
     */
    async processAudio(audioPath: string): Promise<BiocodeResult> {
        const speakerVector = await this.extractSpeakerVector(audioPath);
        return await this.generateBiocode(speakerVector);
    }

    /**
     * Compare two projected vectors for matching
     * Used to verify if a speaker vector matches a stored projected vector
     * @param speakerVector1 - First speaker vector
     * @param speakerVector2 - Second speaker vector (or stored projected vector)
     * @param threshold - Similarity threshold (default: 0.85)
     * @returns True if projected vectors match within threshold
     */
    async compareProjectedVectors(
        speakerVector1: SpeakerVector | ProjectedVector,
        speakerVector2: SpeakerVector | ProjectedVector,
        threshold: number = 0.85,
    ): Promise<boolean> {
        if (!this.projectionMatrix) {
            throw new SessionNotInitializedError('Projection matrix not set. Call setTherapistCredentials() first.');
        }

        // Project vectors if they're SpeakerVector, otherwise use as-is (already projected)
        const projected1 =
            'confidence' in speakerVector1 && (speakerVector1 as SpeakerVector).vector.length >= 100
                ? this.applyProjection((speakerVector1 as SpeakerVector).vector)
                : (speakerVector1 as ProjectedVector).vector;

        const projected2 =
            'confidence' in speakerVector2 && (speakerVector2 as SpeakerVector).vector.length >= 100
                ? this.applyProjection((speakerVector2 as SpeakerVector).vector)
                : (speakerVector2 as ProjectedVector).vector;

        // Calculate cosine similarity
        const similarity = await this.calculateCosineSimilarity(projected1, projected2);
        return similarity >= threshold;
    }

    /**
     * Get the projected vector for storage
     * Store this in the database for later matching
     * @param speakerVector - The extracted speaker vector
     * @returns Projected vector that can be stored and used for matching
     */
    getProjectedVectorForStorage(speakerVector: SpeakerVector): ProjectedVector {
        return this.projectVector(speakerVector);
    }
}
