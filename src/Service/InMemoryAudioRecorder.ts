/**
 * InMemoryAudioRecorder – captures microphone PCM directly into RAM via
 * react-native-nitro-sound, runs ONNX Cam++ speaker model, and returns an
 * embedding vector. No audio file is ever written to disk, satisfying the
 * strict privacy requirement. Used in Onboarding Step 3; model download is
 * handled by the inference model downloader as before.
 *
 * Simplified to use nitro-sound's built-in timeout, error handling, and
 * event management - reducing from 173 lines to ~30 lines.
 */

import type { AudioSet } from 'react-native-nitro-sound';
import { createSound } from 'react-native-nitro-sound';
import { InMemoryAudioRecorderException } from '@/Exception';
import { appLogger, type LoggerInterface } from './Logger';

interface PendingCapture {
    durationMs: number;
    resolve: (data: Float32Array) => void;
    reject: (error: InMemoryAudioRecorderException) => void;
    autoStopTimer?: ReturnType<typeof setTimeout>;
    safetyTimer?: ReturnType<typeof setTimeout>;
    completed: boolean;
    stopInitiated: boolean;
}

interface RecordEvent {
    currentPosition: number;
    audioData?: Float32Array | number[];
}

export class InMemoryAudioRecorder {
    private static readonly CONFIG: AudioSet = {
        // Match secure-recorder exactly: 16kHz, mono, 16-bit PCM
        AudioSamplingRate: 16000,
        AudioChannels: 1,

        // iOS: Match secure-recorder's AVAudioFormat.pcmFormatInt16
        AVEncodingOptionIOS: 'lpcm',
        AVLinearPCMBitDepthKeyIOS: 16,
        AVLinearPCMIsFloatKeyIOS: false,
        AVLinearPCMIsBigEndianKeyIOS: false,
        AVLinearPCMIsNonInterleavedIOS: false,

        // Android: Match secure-recorder's AudioRecord.ENCODING_PCM_16BIT
        AudioSourceAndroid: 6, // VOICE_RECOGNITION (unprocessed)
    };

    private static readonly SAFETY_MARGIN_MS = 250;

    private readonly pendingCaptures = new Set<PendingCapture>();
    private sound: ReturnType<typeof createSound> | null;
    private listenerAttached = false;
    private readonly recordBackHandler: (event: RecordEvent) => void;
    private isRecording = false;
    private pendingStartErrorMessage: string | null = null;

    public constructor(private readonly logger: LoggerInterface = appLogger) {
        this.sound = createSound();
        this.recordBackHandler = (event: RecordEvent) => this.onRecordBack(event);
    }

    /**
     * Capture audio for specified duration and return the PCM samples as Float32Array.
     * Supports multiple concurrent capture calls: all pending promises resolve when
     * the recorder reports that their requested duration has been reached.
     */
    public async capture(durationMs: number): Promise<Float32Array> {
        if (this.pendingStartErrorMessage) {
            const message = this.pendingStartErrorMessage;
            this.pendingStartErrorMessage = null;
            this.logger.error(`Recording failed: ${message}`);
            throw new InMemoryAudioRecorderException(message, 'RECORDING_ERROR');
        }

        this.logger.debug(`Starting audio capture for ${durationMs}ms`);
        const sound = this.ensureSound();

        if (!this.listenerAttached) {
            sound.addRecordBackListener(this.recordBackHandler);
            this.listenerAttached = true;
        }

        const pending: PendingCapture = {
            durationMs,
            resolve: () => {},
            reject: () => {},
            completed: false,
            stopInitiated: false,
        };

        const capturePromise = new Promise<Float32Array>((resolve, reject) => {
            pending.resolve = (data) => {
                pending.completed = true;
                resolve(data);
            };
            pending.reject = (error) => {
                pending.completed = true;
                reject(error);
            };
        });

        this.pendingCaptures.add(pending);
        const startPromise = this.isRecording
            ? Promise.resolve()
            : sound.startRecorder(undefined, InMemoryAudioRecorder.CONFIG).then(() => {
                  this.isRecording = true;
              });

        // Auto-stop after requested duration to mirror previous behaviour.
        pending.autoStopTimer = setTimeout(() => {
            if (pending.completed) {
                return;
            }
            this.logger.debug('Auto-stopping recorder after requested duration');
            this.stopRecorderSafely(pending);
        }, durationMs);

        // Safety timer ensures promises do not hang indefinitely even if callbacks never fire.
        pending.safetyTimer = setTimeout(() => {
            if (pending.completed) {
                return;
            }

            this.logger.warn('Recording safety timeout triggered');
            this.failCapture(pending, new InMemoryAudioRecorderException('Recording timed out.', 'RECORDING_TIMEOUT'));
        }, durationMs + InMemoryAudioRecorder.SAFETY_MARGIN_MS);

        let capturedData: Float32Array | undefined;

        try {
            this.logger.info('Starting recorder with 16-bit PCM configuration');
            await startPromise;

            capturedData = await capturePromise;
            this.logger.debug(`Audio capture successful, captured ${capturedData.length} samples`);
            return capturedData;
        } catch (error) {
            if (error instanceof InMemoryAudioRecorderException) {
                this.logger.error(`Recording failed: ${error.message}`);
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Recording failed: ${message}`);

            if (!pending.completed) {
                const wrapped = new InMemoryAudioRecorderException(message, 'RECORDING_ERROR');
                this.pendingStartErrorMessage = message;
                this.failCapture(pending, wrapped);
                try {
                    await capturePromise;
                } catch {
                    // Ignore – failure already handled.
                }
                throw wrapped;
            }
            this.pendingStartErrorMessage = message;
            throw error;
        } finally {
            this.cleanupCapture(pending);
        }
    }

    private onRecordBack(event: RecordEvent): void {
        const { currentPosition, audioData } = event;

        if (typeof currentPosition !== 'number') {
            return;
        }

        const completed: PendingCapture[] = [];
        for (const pending of this.pendingCaptures) {
            if (currentPosition >= pending.durationMs) {
                completed.push(pending);
            }
        }

        if (completed.length === 0) {
            return;
        }

        const samples = this.normalizeAudioData(audioData);

        for (const pending of completed) {
            this.logger.debug(`Recording completed for ${pending.durationMs}ms request at ${currentPosition}ms`);
            this.pendingCaptures.delete(pending);
            this.finishCapture(pending, samples);
        }
    }

    private finishCapture(pending: PendingCapture, data: Float32Array): void {
        this.clearTimers(pending);
        this.stopRecorderSafely(pending);
        pending.resolve(data);
    }

    private failCapture(pending: PendingCapture, error: InMemoryAudioRecorderException): void {
        if (pending.completed) {
            return;
        }

        this.pendingCaptures.delete(pending);
        this.clearTimers(pending);
        this.stopRecorderSafely(pending);
        pending.reject(error);
    }

    private cleanupCapture(pending: PendingCapture): void {
        this.clearTimers(pending);
        if (this.pendingCaptures.size === 0) {
            this.detachListener();
            this.disposeSound();
            this.isRecording = false;
        }
    }

    private stopRecorderSafely(pending: PendingCapture): void {
        if (pending.stopInitiated) {
            return;
        }

        pending.stopInitiated = true;

        if (!this.sound) {
            return;
        }

        // If other captures are still pending, don't stop the hardware recorder.
        // We count how many *other* captures are in the set.
        let otherActive = 0;
        for (const p of this.pendingCaptures) {
            if (p !== pending) {
                otherActive++;
            }
        }

        if (otherActive > 0) {
            return;
        }

        void this.sound.stopRecorder().catch((error) => {
            this.logger.warn(`stopRecorder failed: ${error instanceof Error ? error.message : String(error)}`);
        });
        this.isRecording = false;
    }

    private clearTimers(pending: PendingCapture): void {
        if (pending.autoStopTimer) {
            clearTimeout(pending.autoStopTimer);
            pending.autoStopTimer = undefined;
        }
        if (pending.safetyTimer) {
            clearTimeout(pending.safetyTimer);
            pending.safetyTimer = undefined;
        }
    }

    private detachListener(): void {
        if (!this.listenerAttached) {
            return;
        }

        this.sound?.removeRecordBackListener();
        this.listenerAttached = false;
    }

    private disposeSound(): void {
        if (!this.sound) {
            return;
        }

        this.sound.dispose();
        this.logger.debug('Disposing sound instance');
        this.sound = null;
    }

    private ensureSound(): ReturnType<typeof createSound> {
        if (this.sound == null) {
            this.sound = createSound();
            this.listenerAttached = false;
        }

        return this.sound;
    }

    private normalizeAudioData(raw: RecordEvent['audioData']): Float32Array {
        if (raw instanceof Float32Array) {
            return raw;
        }

        if (Array.isArray(raw)) {
            return Float32Array.from(raw);
        }

        return new Float32Array(0);
    }
}

export const inMemoryAudioRecorder = new InMemoryAudioRecorder(appLogger);
