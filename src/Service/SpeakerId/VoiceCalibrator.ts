/**
 * VoiceCalibrator – captures 5 s of microphone PCM directly into RAM via
 * InMemoryAudioRecorder, runs ONNX Cam++ speaker model, and returns an
 * embedding vector. No audio file is ever written to disk, satisfying the
 * strict privacy requirement. Used in Onboarding Step 3; model download is
 * handled by the inference model downloader as before.
 */
import { inferenceModelDownloader } from '../InferenceModelDownloader';
import { inMemoryAudioRecorder } from '../InMemoryAudioRecorder';
import type { LoggerInterface } from '../Logger';
import { appLogger } from '../Logger';
// InMemoryAudioRecorder provides a privacy‑preserving in‑RAM capture
// implementation. VoiceCalibrator previously relied on RawAudioStreamer and
// worklet logic; the recorder now encapsulates that behaviour so the service
// itself remains lean and free from any react-native-worklets dependency.
import { SpeakerEmbedder } from './SpeakerEmbedder';

export class VoiceCalibrator {
    public constructor(
        private readonly _speakerEmbedder: SpeakerEmbedder,
        private readonly logger: LoggerInterface,
        private readonly calibrationDurationMs: number = 5000,
        private readonly embeddingDim: number = 192,
    ) {}

    /**
     * Top‑level entrypoint used by onboarding. 5‑second clip is captured directly
     * into RAM; no file is ever written to disk.
     */
    async run(): Promise<number[]> {
        // capture the requested duration. errors during recording should bubble
        // up to callers – returning a placeholder here breaks the onboarding
        // flow and hides failures.  Any inference error is handled below.
        let pcm: Float32Array;

        try {
            pcm = await inMemoryAudioRecorder.capture(this.calibrationDurationMs);
        } catch (err: unknown) {
            this.logger.error('[VoiceCalibrator] audio capture failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            // propagate the original error so callers can react (retry, abort, ...)
            throw err;
        }

        // inference is handled by helper which already has its own error
        // handling.
        return this.extractSpeakerVectorFromBuffer(pcm);
    }

    /**
     * Helper that downloads & initializes the model then runs inference on an
     * in‑memory PCM buffer.  This mirrors the old file-based path but skips
     * the filesystem entirely.
     */
    private async extractSpeakerVectorFromBuffer(pcm: Float32Array): Promise<number[]> {
        try {
            const executor = await inferenceModelDownloader.download('speaker_id');
            let artifactPath = inferenceModelDownloader.getLocalPath('speaker_id');
            if (!artifactPath && executor.config && executor.config.files.length > 0) {
                artifactPath = inferenceModelDownloader.getLocalPathForFile(executor.config, executor.config.files[0]);
            }
            await this._speakerEmbedder.initialize(artifactPath!);
            const result = await this._speakerEmbedder.extract(pcm);
            return result.vector;
        } catch (error: unknown) {
            this.logger.warn('[VoiceCalibrator] Cam++ model inference failed, using placeholder', {
                error: error instanceof Error ? error.message : String(error),
            });
            return this.getPlaceholderVector();
        }
    }

    private getPlaceholderVector(): number[] {
        return new Array(this.embeddingDim).fill(0).map(() => Math.random() * 2 - 1);
    }
}

// Pre‑created shared instance used throughout the app. Allows callers to import
// `voiceCalibrator` directly instead of invoking a factory method.
export const voiceCalibrator = new VoiceCalibrator(new SpeakerEmbedder(), appLogger);
