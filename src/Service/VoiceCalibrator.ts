/**
 * VoiceCalibrator – captures 5 s of microphone PCM directly into RAM using a
 * worklet thread, runs ONNX Cam++ speaker model, and returns an embedding
 * vector. No audio file is ever written to disk, satisfying the strict
 * privacy requirement.  Used in Onboarding Step 3; model download is handled by
 * the inference model downloader as before.
 */

// RawAudioStreamer is a thin wrapper around the native module methods
// startStream/stopStream.  VoiceCalibrator uses this to accumulate exactly
// 5 seconds of 16 kHz PCM in RAM and feed it to the speaker model.
import { rawAudioStreamer } from './RawAudioStreamer';
import { BiocodeGenerator } from './BiocodeGenerator';
import { inferenceModelDownloader } from './InferenceModelDownloader';
import type { LoggerInterface } from './Logger';
import { appLogger } from './Logger';

// defaults but allow overrides via constructor
const DEFAULT_CALIBRATION_DURATION_MS = 5000;
/** Cam++ typical embedding dim (192); Biocode uses this for projection. */
const DEFAULT_EMBEDDING_DIM = 192;

export class VoiceCalibrator {
    private readonly log: LoggerInterface;
    private readonly calibrationDurationMs: number;
    private readonly embeddingDim: number;
    private readonly biocode: BiocodeGenerator;

    constructor(
        logger: LoggerInterface = appLogger,
        calibrationDurationMs: number = DEFAULT_CALIBRATION_DURATION_MS,
        embeddingDim: number = DEFAULT_EMBEDDING_DIM
    ) {
        this.log = logger;
        this.calibrationDurationMs = calibrationDurationMs;
        this.embeddingDim = embeddingDim;
        this.biocode = new BiocodeGenerator(logger);
    }

    /**
     * Top‑level entrypoint used by onboarding. 5‑second clip is captured directly into
     * RAM via a worklet; no file is ever written to disk.
     */
    async run(): Promise<number[]> {
        const targetSamples = (this.calibrationDurationMs / 1000) * 16000;

        return new Promise<number[]>((resolve) => {
            const onComplete = (pcm: Float32Array) => {
                this.extractSpeakerVectorFromBuffer(pcm)
                    .then(resolve)
                    .catch((err) => {
                        this.log.warn('[VoiceCalibrator] Buffer inference failed', {
                            error: err instanceof Error ? err.message : String(err),
                        });
                        resolve(this.getPlaceholderVector());
                    });
            };

            const state = { index: 0, buffer: new Float32Array(targetSamples) };

            const accumulator = (frames: Float32Array) => {
                const remaining = targetSamples - state.index;
                const copyLen = Math.min(remaining, frames.length);
                state.buffer.set(frames.subarray(0, copyLen), state.index);
                state.index += copyLen;
                if (state.index >= targetSamples) {
                    const finished = state.buffer.slice(0);
                    state.index = 0;
                    onComplete(finished as any);
                }
            };

            rawAudioStreamer.start(accumulator as any);
            setTimeout(() => {
                rawAudioStreamer.stop();
            }, this.calibrationDurationMs + 1000);
        });
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
                artifactPath = inferenceModelDownloader.getLocalPathForFile(
                    executor.config,
                    executor.config.files[0],
                );
            }
            await this.biocode.initialize(artifactPath!);
            const result = await this.biocode.extractSpeakerVector(pcm as any);
            return result.vector;
        } catch (error: unknown) {
            this.log.warn('[VoiceCalibrator] Cam++ model inference failed, using placeholder', {
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
export const voiceCalibrator = new VoiceCalibrator();
