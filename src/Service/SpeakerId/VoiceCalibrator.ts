/**
 * VoiceCalibrator – Unified voice calibration service
 *
 * Captures audio via SecureRecorder (file-based with encryption),
 * decrypts it, runs ONNX CAM++ speaker embedding model, and creates a Biocode.
 *
 * Single entry point consolidates the old VoiceCalibrationRecorder logic
 * with proper speaker vector extraction and biocode creation via BiocodeFactory.
 */

import { SecureRecorder } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { RecordingPermissionError } from '@/Exception/RecordingPermissionError';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import type { Biocode } from './Biocode';
import { BiocodeFactory } from './BiocodeFactory';
import { SpeakerEmbedder } from './SpeakerEmbedder';
import type { SpeakerVector } from './SpeakerVector';

export class VoiceCalibrator {
    private static readonly DEFAULT_DURATION_MS = 5000;

    public constructor(
        private readonly speakerEmbedder: SpeakerEmbedder,
        private readonly biocodeFactory: BiocodeFactory,
        private readonly logger: AppLogger,
    ) {}

    /**
     * Capture voice sample and create a biocode.
     *
     * Uses SecureRecorder for encrypted file-based recording, decrypts the file,
     * extracts speaker embedding via ONNX CAM++, and projects through the
     * therapist's projection matrix to create a Biocode.
     *
     * @param projectionMatrix – Therapist's orthonormal projection matrix
     * @param voiceCalibrationDurationMs – How long to record (default: 5000ms)
     * @returns Biocode with speaker vector and metadata
     *
     * @example
     * ```typescript
     * const biocode = await voiceCalibrator.run(projectionMatrix, 8000);
     * ```
     */
    public async run(
        projectionMatrix: number[][],
        voiceCalibrationDurationMs: number = VoiceCalibrator.DEFAULT_DURATION_MS,
    ): Promise<Biocode> {
        this.logger.info('[VoiceCalibrator] Starting voice calibration', {
            durationMs: voiceCalibrationDurationMs,
        });

        try {
            // Ensure recording permission
            await this.ensureRecordingPermission();

            // Capture audio via SecureRecorder
            const pcm = await this.captureViaSecureRecorder(voiceCalibrationDurationMs);

            this.logger.debug('[VoiceCalibrator] Audio capture complete', {
                pcmLength: pcm.length,
            });

            // Extract speaker vector from PCM
            const speakerVector = await this.extractSpeakerVector(pcm);

            // Create biocode via projection
            const biocode = this.biocodeFactory.create(speakerVector, projectionMatrix);

            this.logger.info('[VoiceCalibrator] Voice calibration complete', {
                confidence: speakerVector.confidence,
            });

            return biocode;
        } catch (error: unknown) {
            this.logger.error('[VoiceCalibrator] Voice calibration failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Ensure microphone recording permission is granted.
     * Requests permission from user if not already granted.
     */
    private async ensureRecordingPermission(): Promise<void> {
        const hasPermission = await SecureRecorder.hasPermission();
        if (hasPermission) {
            return;
        }

        const granted = await SecureRecorder.requestPermission();
        if (!granted) {
            throw new RecordingPermissionError('Microphone permission is required for voice calibration recording');
        }
    }

    /**
     * Capture audio using SecureRecorder, decrypt it, and return as PCM.
     *
     * Steps:
     * 1. Start recording with a unique session ID
     * 2. Wait for the specified duration
     * 3. Stop recording and get the encrypted file path
     * 4. Stream decrypt the file, collecting audio chunks
     * 5. Merge chunks and convert to Float32Array PCM
     */
    private async captureViaSecureRecorder(durationMs: number): Promise<Float32Array> {
        const sessionId = this.generateSessionId();
        const recorder = new SecureRecorder(sessionId);

        try {
            await recorder.initialize();
            await recorder.start();
            this.logger.debug('[VoiceCalibrator] Recording started', { sessionId });

            // Wait for recording window
            await new Promise((resolve) => setTimeout(resolve, durationMs));

            const encryptedFilePath = await recorder.stop();
            this.logger.debug('[VoiceCalibrator] Recording stopped', {
                sessionId,
                encryptedFilePath,
            });

            // Decrypt and collect audio chunks
            const pcm = await this.decryptAndConvertToPcm(encryptedFilePath);
            return pcm;
        } catch (error: unknown) {
            this.logger.error('[VoiceCalibrator] SecureRecorder capture failed', {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        } finally {
            recorder.dispose();
        }
    }

    /**
     * Stream decrypt a SecureRecorder-encrypted file and return as Float32Array PCM.
     *
     * Listens to decryption events, collects Uint8Array chunks, merges them,
     * and converts the raw bytes to normalized PCM.
     */
    private decryptAndConvertToPcm(encryptedPath: string): Promise<Float32Array> {
        const chunks: Uint8Array[] = [];

        return new Promise((resolve, reject) => {
            const subscription = SecureRecorder.addDecryptionListener((event) => {
                chunks.push(event.data);

                if (event.isLast) {
                    subscription.remove();
                    try {
                        const merged = this.mergeChunks(chunks);
                        const pcm = this.uint8ToPcm(merged);
                        resolve(pcm);
                    } catch (error) {
                        reject(error);
                    }
                }
            });

            SecureRecorder.stream(encryptedPath).catch((error: unknown) => {
                subscription.remove();
                reject(error);
            });
        });
    }

    /**
     * Extract speaker vector from in-memory PCM buffer.
     * Downloads and initializes the speaker recognition model as needed.
     */
    private async extractSpeakerVector(pcm: Float32Array): Promise<SpeakerVector> {
        try {
            // Download model if needed
            const executor = await Container.get(InferenceModelDownloader).download('speaker_id');

            // Resolve artifact path
            let artifactPath = Container.get(InferenceModelDownloader).getLocalPath('speaker_id');
            if (!artifactPath && executor.config?.files.length) {
                artifactPath = Container.get(InferenceModelDownloader).getLocalPathForFile(
                    executor.config,
                    executor.config.files[0],
                );
            }

            if (!artifactPath) {
                throw new Error('Speaker ID artifact path unavailable after download');
            }

            // Initialize and extract
            await this.speakerEmbedder.initialize(artifactPath);
            const result = await this.speakerEmbedder.extract(pcm);
            return result;
        } catch (error: unknown) {
            this.logger.warn('[VoiceCalibrator] Speaker embedding failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Merge multiple Uint8Array chunks into a single buffer.
     */
    private mergeChunks(chunks: Uint8Array[]): Uint8Array {
        let totalLength = 0;
        for (const chunk of chunks) {
            totalLength += chunk.length;
        }

        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }

        return merged;
    }

    /**
     * Convert raw Uint8Array bytes to normalized Float32Array PCM.
     * Uses native TypedArrays for maximum performance (Hermes engine optimized).
     *
     * @param buffer Raw bytes from encrypted audio
     * @returns Normalized PCM in range [-1, 1]
     */
    private uint8ToPcm(buffer: Uint8Array): Float32Array {
        // 1. On crée une "vue" Int16 directement sur la mémoire RAM du buffer.
        // Le moteur JS gère l'endianness et le signe nativement.
        const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

        // 2. On prépare le tableau de destination
        const pcm = new Float32Array(int16Array.length);

        // 3. Normalisation simple et lisible
        for (let i = 0; i < int16Array.length; i++) {
            pcm[i] = int16Array[i] / 32768.0;
        }

        return pcm;
    }

    /**
     * Generate a unique session ID for SecureRecorder.
     * Format: voice-calibration-{timestamp}
     */
    private generateSessionId(): string {
        return `voice-calibration-${Date.now()}`;
    }
}

// Register with Container for production use
Container.register(
    VoiceCalibrator,
    () => new VoiceCalibrator(Container.get(SpeakerEmbedder), new BiocodeFactory(), Container.get(AppLogger)),
);
