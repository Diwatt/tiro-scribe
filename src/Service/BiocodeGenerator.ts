/**
 * BiocodeGenerator - Voice Identity & Vector Projection
 *
 * Implements the biocoding protocol:
 * 1. Extract speaker vector using sherpa-onnx
 * 2. Project vector using therapist's password-derived projection matrix
 * 3. Store projected vector for matching while preventing reverse engineering
 */

import { File, Paths } from 'expo-file-system';
import type * as Ort from 'onnxruntime-react-native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import QuickCrypto, { Buffer } from 'react-native-quick-crypto';
import { CryptoEngine } from '@/Security/CryptoEngine';

dayjs.extend(utc);

/** Lazy-loaded ONNX Runtime; avoids loading native module until BiocodeGenerator actually needs it. */
let ortModule: typeof Ort | null = null;
async function getOrt(): Promise<typeof Ort> {
    if (ortModule == null) {
        ortModule = await import('onnxruntime-react-native');
    }
    return ortModule;
}

import type { Therapist } from '@/Entity';
import {
    InvalidAudioFormatError,
    InvalidDimensionError,
    SessionNotInitializedError,
    SpeakerVectorExtractionError,
    VectorLengthMismatchError,
} from '../Exception';
import { masterKeyVault } from '../Security/MasterKeyVault';
import { appLogger, type LoggerInterface } from './Logger';
import { inferenceModelDownloader } from './InferenceModelDownloader';

/** Extracted speaker vector from audio (e.g. Sherpa-ONNX). */
export class SpeakerVector {
    constructor(
        public vector: number[],
        public confidence: number,
    ) {}
}

/** Result of BiocodeGenerator.generateBiocode / processAudio. timestamp: Dayjs UTC. */
export class BiocodeResult {
    constructor(
        /**
         * The projected vector itself.  Previously we stored a SHA‑256 hash here,
         * but floating‑point drift made the hashes unstable.  Consumers should
         * persist this array (e.g. JSON) instead of a fixed string.
         */
        public biocode: number[],
        public confidence: number,
        public timestamp: dayjs.Dayjs,
    ) {}
}

/**
 * Biocode constants for LCG algorithm and vector dimensions
 */
const BIocode = {
    DEFAULT_INPUT_DIM: 192,
    DEFAULT_OUTPUT_DIM: 128,
} as const;

/**
 * Projected vector result
 */
export interface ProjectedVector {
    vector: number[];
    confidence: number;
}

export class BiocodeGenerator {
    private speakerSession: Ort.InferenceSession | null = null;
    private projectionMatrix: number[][] | null = null;
    private loggerInstance: LoggerInterface;
    private modelPath: string | null = null;
    private therapistUuid: string | null = null;
    private readonly crypto: CryptoEngine;

    /**
     * @param logger - optional logger instance
     * @param crypto - crypto engine used for projection matrix derivation
     */
    constructor(logger: LoggerInterface = appLogger, crypto: CryptoEngine = new CryptoEngine()) {
        this.loggerInstance = logger;
        this.crypto = crypto;
    }

    /**
     * Initialize the BiocodeGenerator with ONNX Runtime and speaker recognition model
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
        const config = await inferenceModelDownloader.getConfigByLocalPath(modelPath);
        if (config != null) {
            const { uri } = await inferenceModelDownloader.download(config.capability);
            return uri!; // uri is defined when download resolves successfully
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
        // derive a 32‑byte deterministic key from the provided projection key
        const keyHex = this.crypto.keyFromPassword(key, 'biocode_projection');
        const keyBuf = Buffer.from(keyHex, 'hex');

        // construct AES-256-CTR cipher; IV fixed to zeros ensures deterministic
        const iv = Buffer.alloc(16, 0);
        const cipher = QuickCrypto.createCipheriv('aes-256-ctr', keyBuf, iv);

        const total = inputDim * outputDim;
        const bytesNeeded = total * 4; // 4 bytes per float
        const zeros = Buffer.alloc(bytesNeeded, 0);
        const randomBytes = Buffer.concat([cipher.update(zeros), cipher.final()]);

        const matrix: number[][] = [];
        let offset = 0;
        for (let i = 0; i < outputDim; i++) {
            matrix[i] = [];
            for (let j = 0; j < inputDim; j++) {
                const uint = randomBytes.readUInt32LE(offset);
                offset += 4;
                // map [0, 2^32-1] -> [-1,1]
                const value = (uint / 0xffffffff) * 2 - 1;
                matrix[i][j] = value;
            }
        }

        // Orthonormalize the matrix to preserve distances better
        return this.orthonormalize(matrix);
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
     * Extract speaker vector from a file path or raw PCM buffer using ONNX Runtime.
     * Accepting a Float32Array allows callers to avoid any disk I/O.
     * @param audioInput - Path to the audio file *or* raw PCM buffer (16 kHz
     * mono, normalized to [-1,1]).
     * @returns Speaker vector with confidence score
     */
    async extractSpeakerVector(audioInput: string | Float32Array): Promise<SpeakerVector> {
        if (!this.speakerSession) {
            throw new SessionNotInitializedError('Biocode not initialized. Call initialize() first.');
        }

        try {
            // Step 1: Load and preprocess audio (overloaded for file vs buffer)
            let audioFeatures: Float32Array;
            if (typeof audioInput === 'string') {
                audioFeatures = await this.preprocessAudio(audioInput);
            } else {
                audioFeatures = await this.preprocessBuffer(audioInput);
            }

            // Step 2: Run inference with ONNX Runtime
            const embedding = await this.runSpeakerInference(audioFeatures);

            // Step 3: Normalize the embedding vector
            const normalizedEmbedding = this.normalizeVector(embedding);

            // Calculate confidence based on vector magnitude
            const confidence = Math.min(1.0, Math.sqrt(normalizedEmbedding.reduce((sum, val) => sum + val * val, 0)));
            return new SpeakerVector(normalizedEmbedding, confidence);
        } catch (error) {
            throw new SpeakerVectorExtractionError(`Failed to extract speaker vector: ${error}`, error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Preprocess audio file to extract features (mel spectrogram)
     * Reads the file as Base64, converts to PCM and then reuses the buffer
     * preprocessing logic.  This keeps the implementation entirely in JS and
     * avoids any file I/O after the decoded buffer is created.
     */
    private async preprocessAudio(audioPath: string): Promise<Float32Array> {
        // load file and convert to float32 PCM
        const base64 = await FileSystem.readAsStringAsync(audioPath, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const pcm = this.base64ToFloat32(base64);
        return this.preprocessBuffer(pcm);
    }

    /**
     * Convert Base64‑encoded 16‑bit PCM (little‑endian) into normalized floats.
     */
    private base64ToFloat32(base64: string): Float32Array {
        const buf = Buffer.from(base64, 'base64');
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        const out = new Float32Array(buf.length / 2);
        for (let i = 0; i < out.length; i++) {
            const int16 = view.getInt16(i * 2, true);
            out[i] = int16 / 0x8000;
        }
        return out;
    }

    /**
     * Preprocess a raw PCM buffer (16 kHz mono, Float32Array) to the feature
     * tensor expected by the speaker model.  Callers should normalize the PCM
     * samples to [-1,1] before invoking.
     */
    private async preprocessBuffer(pcm: Float32Array): Promise<Float32Array> {
        if (pcm.length === 0) {
            throw new InvalidAudioFormatError('PCM buffer is empty');
        }

        // model expects 16 kHz mono
        const sampleRate = 16000;
        const frameLen = 400; // 25 ms
        const hopLen = 160; // 10 ms
        const nFft = 512;
        const nMels = 80;

        // 1. pre‑emphasis
        const alpha = 0.97;
        const emphasized = new Float32Array(pcm.length);
        emphasized[0] = pcm[0];
        for (let i = 1; i < pcm.length; i++) {
            emphasized[i] = pcm[i] - alpha * pcm[i - 1];
        }

        // 2. framing + windowing
        const frameCount = Math.floor((emphasized.length - frameLen) / hopLen) + 1;
        if (frameCount <= 0) {
            throw new InvalidAudioFormatError('PCM buffer too short for framing');
        }

        const window = this.hammingWindow(frameLen);
        const frames: Float32Array[] = new Array(frameCount);
        for (let i = 0; i < frameCount; i++) {
            const start = i * hopLen;
            const frame = emphasized.subarray(start, start + frameLen);
            const windowed = new Float32Array(frameLen);
            for (let j = 0; j < frameLen; j++) {
                windowed[j] = frame[j] * window[j];
            }
            frames[i] = windowed;
        }

        // 3. mel filters
        const melFilters = this.melFilterBank(nFft, nMels, sampleRate);
        const output = new Float32Array(nMels * frameCount);

        // 4. compute mel spectrogram
        for (let i = 0; i < frameCount; i++) {
            const powerSpec = this.powerSpectrum(frames[i], nFft);
            for (let m = 0; m < nMels; m++) {
                let sum = 0;
                const filter = melFilters[m];
                for (let k = 0; k < filter.length; k++) {
                    sum += powerSpec[k] * filter[k];
                }
                output[i * nMels + m] = Math.log10(sum + 1e-8);
            }
        }

        return output;
    }

    /**
     * Generate a Hamming window of given length.
     */
    private hammingWindow(length: number): Float32Array {
        const w = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (length - 1));
        }
        return w;
    }

    /**
     * Compute power spectrum for a single frame using naive DFT.
     * Returns an array of length nFft/2+1 containing the power at each bin.
     */
    private powerSpectrum(frame: Float32Array, nFft: number): Float32Array {
        const half = nFft / 2 + 1;
        const spec = new Float32Array(half);
        for (let k = 0; k < half; k++) {
            let real = 0;
            let imag = 0;
            for (let n = 0; n < frame.length; n++) {
                const angle = (2 * Math.PI * k * n) / nFft;
                real += frame[n] * Math.cos(angle);
                imag -= frame[n] * Math.sin(angle);
            }
            spec[k] = real * real + imag * imag;
        }
        return spec;
    }

    /**
     * Create mel filter bank matrix [nMels x (nFft/2+1)].
     */
    private melFilterBank(nFft: number, nMels: number, sampleRate: number): Float32Array[] {
        const fMin = 0;
        const fMax = sampleRate / 2;
        const melMin = 2595 * Math.log10(1 + fMin / 700);
        const melMax = 2595 * Math.log10(1 + fMax / 700);
        const melPoints = new Float32Array(nMels + 2);
        for (let i = 0; i < melPoints.length; i++) {
            melPoints[i] = melMin + ((melMax - melMin) / (nMels + 1)) * i;
        }
        const hzPoints = melPoints.map((m) => 700 * (10 ** (m / 2595) - 1));
        const bin = hzPoints.map((hz) => Math.floor((nFft + 1) * hz / sampleRate));
        const filters: Float32Array[] = [];
        const half = nFft / 2 + 1;
        for (let m = 1; m <= nMels; m++) {
            const filter = new Float32Array(half);
            const start = bin[m - 1];
            const center = bin[m];
            const end = bin[m + 1];
            for (let k = start; k < center; k++) {
                if (k >= 0 && k < half) {
                    filter[k] = (k - start) / (center - start);
                }
            }
            for (let k = center; k < end; k++) {
                if (k >= 0 && k < half) {
                    filter[k] = (end - k) / (end - center);
                }
            }
            filters.push(filter);
        }
        return filters;
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

        const ort = await getOrt();
        const tensor = new ort.Tensor('float32', buffer, inputShape);
        const results = await this.speakerSession.run({ [inputName]: tensor });
        const outputTensor = results[outputName];
        return Array.from(outputTensor.data as Float32Array);
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

        // Project the vector and hand it back to the caller.  Previously we
        // hashed the projection to a hex string; floating point drift made that
        // unreliable during matching.  Consumers should persist the numeric
        // array (e.g. JSON) and compare using cosine similarity later.
        const projected = this.applyProjection(speakerVector.vector);
        return new BiocodeResult(projected, speakerVector.confidence, dayjs.utc());
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
