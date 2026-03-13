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
import { ProjectionMatrixFactory } from '@/Math/ProjectionMatrixFactory';
import { VoiceCalibrationRecorder } from '@/Service/VoiceCalibrationRecorder';
import { OnnxRuntime } from '../OnnxRuntime';
import type { Biocode } from './Biocode';
import { BiocodeFactory } from './BiocodeFactory';
import { SpeakerEmbedder } from './SpeakerEmbedder';

export class VoiceCalibrator {
    private static readonly DEFAULT_DURATION_MS = 5000;

    private _modelInitialized = false;

    public constructor(
        private readonly recorder: VoiceCalibrationRecorder,
        private readonly speakerEmbedder: SpeakerEmbedder,
        private readonly runtime: OnnxRuntime,
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
    /**
     * Capture a voice sample and create a biocode. The only supported call
     * signature takes a therapist master key; callers no longer need to supply
     * a projection matrix directly.
     *
     * Internally the method will record audio, extract a speaker vector via the
     * `SpeakerEmbedder`, and then request a projection matrix from
     * `ProjectionMatrixFactory` sized to the vector's length.  This keeps the
     * API stable when the model output dimension changes.
     *
     * @param masterKey – Therapist master key string used to derive projection
     *                    matrix.
     * @param voiceCalibrationDurationMs – How long to record (default 5000ms)
     */
    public async run(
        masterKey: string,
        voiceCalibrationDurationMs: number = VoiceCalibrator.DEFAULT_DURATION_MS,
    ): Promise<Biocode> {
        this.logger.info('[VoiceCalibrator] Starting voice calibration', {
            durationMs: voiceCalibrationDurationMs,
        });

        try {
            // ensure ONNX session is ready for speaker embedding.  the runtime
            // now manages downloads/sessions directly.
            await this.ensureModel('speaker_id');

            // use the injected recorder to capture PCM
            const pcm = await this.recorder.capture(voiceCalibrationDurationMs);

            this.logger.debug('[VoiceCalibrator] Audio capture complete', {
                pcmLength: pcm.length,
            });

            // Extract speaker vector from PCM
            const speakerVector = await this.speakerEmbedder.extract(pcm);

            // Generate projection matrix based on master key and vector length
            const projectionMatrix = this.projectionMatrixFactory.create(masterKey, speakerVector.vector.length);

            // Create biocode via projection
            const biocode = this.biocodeFactory.create(speakerVector, projectionMatrix);

            this.logger.info('[VoiceCalibrator] Voice calibration complete', {
                confidence: speakerVector.confidence,
            });

            return biocode;
        } catch (error: unknown) {
            // log the raw object so we can inspect unexpected shapes (e.g. RN errors)
            const errorMessage = error instanceof Error ? error.message : undefined;
            const errorStack = error instanceof Error ? error.stack : undefined;
            type WithOriginalError = { originalError?: unknown };
            const originalError = (error as WithOriginalError).originalError;
            const originalErrorStack = originalError instanceof Error ? originalError.stack : undefined;

            this.logger.error('[VoiceCalibrator] Voice calibration failed', {
                error,
                message: errorMessage,
                stack: errorStack,
                originalStack: originalErrorStack,
            });
            throw error;
        }
    }

    /**
     * Ensure the ONNX model session for the given capability is ready.
     * The runtime handles downloads and session caching directly.
     */
    private async ensureModel(capability: string): Promise<void> {
        if (this._modelInitialized) {
            return;
        }

        await this.runtime.load(capability);
        this._modelInitialized = true;
    }
}

// Register with Container for production use
Container.register(
    VoiceCalibrator,
    () =>
        new VoiceCalibrator(
            Container.get(VoiceCalibrationRecorder),
            Container.get(SpeakerEmbedder),
            Container.get(OnnxRuntime),
            new BiocodeFactory(),
            Container.get(AppLogger),
            Container.get(ProjectionMatrixFactory),
        ),
);
