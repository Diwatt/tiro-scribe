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
import { ProjectionMatrixFactory } from '@/Math/ProjectionMatrixFactory';

export class VoiceCalibrator {
    private static readonly DEFAULT_DURATION_MS = 5000;

    public constructor(
        private readonly recorder: VoiceCalibrationRecorder,
        private readonly speakerEmbedder: SpeakerEmbedder,
        private readonly biocodeFactory: BiocodeFactory,
        private readonly logger: AppLogger,
        private readonly projectionMatrixFactory: ProjectionMatrixFactory,
    ) {}

    /**
     * Capture voice sample and create a biocode.
     *
     * Uses SecureRecorder for encrypted file-based recording, decrypts the file,
      * extracts speaker embedding via ONNX CAM++, and projects through the
     * therapist's projection matrix to create a Biocode.
     *
     * This method supports two calling styles:
     * 1. Pass a **projection matrix** directly (legacy behaviour).
     * 2. Pass a **master key string**; the calibrator will derive an appropriately
     *    sized projection matrix internally using the injected
     *    `ProjectionMatrixFactory` once the speaker vector has been extracted.
     *
     * @param projectionMatrixOrMasterKey – Either an orthonormal matrix or a
     *                                      therapist master key.
     * @param voiceCalibrationDurationMs – How long to record (default: 5000ms)
     * @returns Biocode with speaker vector and metadata
     *
     * @example
     * ```typescript
     * // legacy: caller already has a matrix
     * const biocode = await voiceCalibrator.run(projectionMatrix, 8000);
     *
     * // new: just hand over the master key, matrix is built automatically
     * const biocode = await voiceCalibrator.run('therapist-key-123');
     * ```
     */
    public async run(
        projectionMatrix: number[][],
        voiceCalibrationDurationMs?: number,
    ): Promise<Biocode>;

    public async run(
        masterKey: string,
        voiceCalibrationDurationMs?: number,
    ): Promise<Biocode>;

    public async run(
        matrixOrKey: number[][] | string,
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

            // simple sanity check: at 16kHz we expect ~16 samples per millisecond.
            // if we recorded significantly less than the requested duration it's
            // likely the session was interrupted by the OS or the simulator and
            // the result may be unusable.  Log a warning so developers can
            // diagnose the problem; callers could choose to treat it as failure
            // if they prefer stricter behaviour.
            const expectedSamples = 16000 * (voiceCalibrationDurationMs / 1000);
            if (pcm.length < expectedSamples * 0.5) {
                this.logger.warn('[VoiceCalibrator] captured much less audio than expected', {
                    requestedMs: voiceCalibrationDurationMs,
                    expectedSamples,
                    actualSamples: pcm.length,
                });
            }

            // Extract speaker vector from PCM
            const speakerVector = await this.speakerEmbedder.extract(pcm);

            // Determine projection matrix.  If this call was supplied with a
            // master key we use the factory to build a matrix sized to the
            // speaker vector; otherwise we trust the provided matrix verbatim.
            let projectionMatrix: number[][];
            if (typeof matrixOrKey === 'string') {
                projectionMatrix = this.projectionMatrixFactory.create(
                    matrixOrKey,
                    speakerVector.vector.length,
                );
            } else {
                projectionMatrix = matrixOrKey;
            }

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
            Container.get(ProjectionMatrixFactory),
        ),
);
