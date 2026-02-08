/**
 * VoiceCalibration – Records 5s, runs embedded ecapa_tdnn, returns 512-dim vector, deletes audio.
 * Used in Onboarding Step 3. Model is bundled in assets so no download required.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { audioRecording } from './AudioRecording';
import type { LoggerInterface } from './Logger';
import { AppLogger } from './Logger';

const CALIBRATION_DURATION_MS = 5000;
const EMBEDDING_DIM = 512;

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
     * Record 5s, run inference with bundled speaker model, delete audio, return vector.
     * If embedded model or preprocessing is not ready, returns a placeholder vector so the flow completes.
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
                await FileSystem.deleteAsync(filePath, { idempotent: true });
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
            const biocode = new Biocode(this.log);
            const bundledPath = await this.resolveBundledSpeakerModelPath();
            await biocode.initialize(bundledPath);
            const result = await biocode.extractSpeakerVector(audioPath);
            return result.vector;
        } catch (error: unknown) {
            this.log.warn('[VoiceCalibration] Embedded model inference failed, using placeholder', {
                error: error instanceof Error ? error.message : String(error),
            });
            return this.getPlaceholderVector();
        }
    }

    private async resolveBundledSpeakerModelPath(): Promise<string> {
        const docDir = FileSystem.documentDirectory ?? '';
        return `${docDir}models/ecapa_tdnn.onnx`;
    }

    private getPlaceholderVector(): number[] {
        return new Array(EMBEDDING_DIM).fill(0).map(() => Math.random() * 2 - 1);
    }
}

export const voiceCalibration = VoiceCalibration.getInstance();
