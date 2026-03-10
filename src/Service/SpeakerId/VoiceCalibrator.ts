/**
 * VoiceCalibrator – Unified voice calibration service
 *
 * Coordinates high‑level calibration steps:
 *   1. ask its injected `VoiceCalibrationRecorder` to capture a voice sample
 *   2. run the ONNX CAM++ speaker embedding model on the PCM
 *   3. project the vector and produce a Biocode via BiocodeFactory
 *
 * The recorder abstraction encapsulates all SecureRecorder interaction and
 * decryption; this class does **no I/O** itself.  Callers can supply real or
 * fake implementations for testing.
 *
 * Historically the class contained its own recording logic; the current design
 * extracts that responsibility into `VoiceCalibrationRecorder` (see
 * `src/Service/VoiceCalibrationRecorder.ts`).
 */

import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { VoiceCalibrationRecorder } from '@/Service/VoiceCalibrationRecorder';
import type { Biocode } from './Biocode';
import { BiocodeFactory } from './BiocodeFactory';
import { SpeakerEmbedder } from './SpeakerEmbedder';

export class VoiceCalibrator {
    private static readonly DEFAULT_DURATION_MS = 5000;

    public constructor(
        private readonly recorder: VoiceCalibrationRecorder,
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
            // ensure model is available before we start recording; avoids wasted
            // microphone sessions if the model is missing
            await this.speakerEmbedder.loadModel('speaker_id');

            // use the injected recorder to capture PCM
            const pcm = await this.recorder.capture(voiceCalibrationDurationMs);

            this.logger.debug('[VoiceCalibrator] Audio capture complete', {
                pcmLength: pcm.length,
            });

            // Extract speaker vector from PCM
            const speakerVector = await this.speakerEmbedder.extract(pcm);

            // Create biocode via projection
            const biocode = this.biocodeFactory.create(speakerVector, projectionMatrix);

            this.logger.info('[VoiceCalibrator] Voice calibration complete', {
                confidence: speakerVector.confidence,
            });

            return biocode;
        } catch (error: unknown) {
            // log the raw object so we can inspect unexpected shapes (e.g. RN errors)
            this.logger.error('[VoiceCalibrator] Voice calibration failed', {
                error,
                message: error instanceof Error ? error.message : undefined,
            });
            throw error;
        }
    }
}

// Register with Container for production use
Container.register(
    VoiceCalibrator,
    () =>
        new VoiceCalibrator(
            Container.get(VoiceCalibrationRecorder),
            Container.get(SpeakerEmbedder),
            new BiocodeFactory(),
            Container.get(AppLogger),
        ),
);
