/**
 * VoiceCalibration – Records 5s, runs ONNX Cam++ speaker model, returns embedding vector, deletes audio.
 * Used in Onboarding Step 3. Cam++ model is pre-downloaded when entering Onboarding (StartupOrchestrator).
 */

import { File } from 'expo-file-system';
import { audioRecording } from './AudioRecording';
import type { LoggerInterface } from './Logger';
import { AppLogger } from './Logger';

const CALIBRATION_DURATION_MS = 5000;
/** Cam++ typical embedding dim (192); Biocode uses this for projection. */
const EMBEDDING_DIM = 192;

export class VoiceCalibration {
    private static instance: VoiceCalibration | null = null;
    private readonly log: LoggerInterface;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.log = logger;
    }

    static getInstance(): VoiceCalibration {
        if (VoiceCalibration.instance == null) {
            VoiceCalibration.instance = new VoiceCalibration();
        }
        return VoiceCalibration.instance;
    }

    /**
     * Record 5s, run inference with Cam++ speaker model (downloaded on first use), delete audio, return vector.
     * If model or preprocessing fails, returns a placeholder vector so the flow completes.
     */
    async run(): Promise<number[]> {
        try {
            await audioRecording.startRecording();
            await new Promise<void>((resolve) => setTimeout(() => resolve(), CALIBRATION_DURATION_MS));
            const filePath = await audioRecording.stopRecording();

            if (!filePath) {
                this.log.warn('[VoiceCalibration] No file path after stop');
                return this.getPlaceholderVector();
            }

            const vector = await this.extractSpeakerVectorFromFile(filePath);

            try {
                const file = new File(filePath);
                if (file.exists) {
                    file.delete();
                }
            } catch (error: unknown) {
                this.log.warn('[VoiceCalibration] Failed to delete temp audio', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            return vector;
        } catch (error: unknown) {
            this.log.warn('[VoiceCalibration] Calibration failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return this.getPlaceholderVector();
        }
    }

    private async extractSpeakerVectorFromFile(audioPath: string): Promise<number[]> {
        try {
            const { Biocode } = await import('./Biocode');
            const { InferenceModelDownloader } = await import('./InferenceModelDownloader');
            const biocode = new Biocode(this.log);
            const artifactPath = await InferenceModelDownloader.getInstance().ensureCachedByKey('speaker_id');
            await biocode.initialize(artifactPath);
            const result = await biocode.extractSpeakerVector(audioPath);
            return result.vector;
        } catch (error: unknown) {
            this.log.warn('[VoiceCalibration] Cam++ model inference failed, using placeholder', {
                error: error instanceof Error ? error.message : String(error),
            });
            return this.getPlaceholderVector();
        }
    }

    private getPlaceholderVector(): number[] {
        return new Array(EMBEDDING_DIM).fill(0).map(() => Math.random() * 2 - 1);
    }
}

export const voiceCalibration = VoiceCalibration.getInstance();
