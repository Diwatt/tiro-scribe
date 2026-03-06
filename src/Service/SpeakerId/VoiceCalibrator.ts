/**
 * VoiceCalibrator – captures 5 s of microphone PCM directly into RAM via
 * InMemoryAudioRecorder, runs ONNX Cam++ speaker model, and returns an
 * embedding vector. No audio file is ever written to disk, satisfying the
 * strict privacy requirement. Used in Onboarding Step 3; model download is
 * handled by the inference model downloader as before.
 */

import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { InMemoryAudioRecorder } from '@/Service';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
// InMemoryAudioRecorder provides a privacy‑preserving in‑RAM capture
// worklet logic; the recorder now encapsulates that behaviour so the service
// itself remains lean and free from any react-native-worklets dependency.
import type { Biocode } from './Biocode';
import { BiocodeFactory } from './BiocodeFactory';
import { SpeakerEmbedder } from './SpeakerEmbedder';
import type { SpeakerVector } from './SpeakerVector';

export class VoiceCalibrator {
    public constructor(
        private readonly _speakerEmbedder: SpeakerEmbedder = Container.get(SpeakerEmbedder),
        private readonly biocodeFactory: BiocodeFactory = Container.get(BiocodeFactory),
        private readonly logger: AppLogger,
        private readonly calibrationDurationMs: number = 5000,
    ) {}

    /**
     * Top‑level entrypoint used by onboarding. 5‑second clip is captured directly
     * into RAM; no file is ever written to disk.
     */
    public async run(projectionMatrix: number[][]): Promise<Biocode> {
        // capture the requested duration. errors during recording should bubble
        // up to callers – returning a placeholder here breaks the onboarding
        // flow and hides failures.  Any inference error is handled below.
        let pcm: Float32Array;

        try {
            pcm = await Container.get(InMemoryAudioRecorder).capture(this.calibrationDurationMs);
        } catch (err: unknown) {
            this.logger.error('[VoiceCalibrator] audio capture failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            // propagate the original error so callers can react (retry, abort, ...)
            throw err;
        }

        const speakerVector = await this.extractSpeakerVectorFromBuffer(pcm);
        return this.biocodeFactory.create(speakerVector, projectionMatrix);
    }

    /**
     * Helper that downloads & initializes the model then runs inference on an
     * in‑memory PCM buffer.  This mirrors the old file-based path but skips
     * the filesystem entirely.
     */
    private async extractSpeakerVectorFromBuffer(pcm: Float32Array): Promise<SpeakerVector> {
        try {
            const executor = await Container.get(InferenceModelDownloader).download('speaker_id');
            let artifactPath = Container.get(InferenceModelDownloader).getLocalPath('speaker_id');
            if (!artifactPath && executor.config && executor.config.files.length > 0) {
                artifactPath = Container.get(InferenceModelDownloader).getLocalPathForFile(
                    executor.config,
                    executor.config.files[0],
                );
            }

            if (!artifactPath) {
                throw new Error('Speaker ID artifact path unavailable after download');
            }

            await this._speakerEmbedder.initialize(artifactPath);
            const result = await this._speakerEmbedder.extract(pcm);
            return result;
        } catch (error: unknown) {
            this.logger.warn('[VoiceCalibrator] Cam++ model inference failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}

Container.register(
    VoiceCalibrator,
    () => new VoiceCalibrator(Container.get(SpeakerEmbedder), Container.get(BiocodeFactory), Container.get(AppLogger)),
);
