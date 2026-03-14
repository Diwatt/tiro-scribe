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
     * Perform voice calibration in two phases:
     *   1. record and decrypt a voice sample to PCM
     *   2. extract speaker embedding + project to a Biocode
     *
     * These steps are split so callers can show UI progress for each stage.
     */
    public async captureVoiceSample(durationMs: number): Promise<Float32Array> {
        try {
            // recording does not require the model to be loaded
            await this.recorder.capture(durationMs);
            return await this.recorder.getPcm();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : undefined;
            const errorStack = error instanceof Error ? error.stack : undefined;
            type WithOriginalError = { originalError?: unknown };
            const originalError = (error as WithOriginalError).originalError;
            const originalErrorStack = originalError instanceof Error ? originalError.stack : undefined;

            this.logger.error('[VoiceCalibrator] captureVoiceSample failed', {
                error,
                message: errorMessage,
                stack: errorStack,
                originalStack: originalErrorStack,
                durationMs,
            });

            throw error;
        }
    }

    /**
     * Convert PCM into a Biocode using the speaker embedding model and projection.
     */
    public async generateBiocode(masterKey: string, pcm: Float32Array): Promise<Biocode> {
        try {
            await this.ensureModel('speaker_id');

            // Extract speaker vector from PCM
            const speakerVector = await this.speakerEmbedder.extract(pcm);

            // Generate projection matrix based on master key and vector length
            const projectionMatrix = this.projectionMatrixFactory.create(masterKey, speakerVector.vector.length);

            return this.biocodeFactory.create(speakerVector, projectionMatrix);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : undefined;
            const errorStack = error instanceof Error ? error.stack : undefined;
            type WithOriginalError = { originalError?: unknown };
            const originalError = (error as WithOriginalError).originalError;
            const originalErrorStack = originalError instanceof Error ? originalError.stack : undefined;

            this.logger.error('[VoiceCalibrator] generateBiocode failed', {
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
