/**
 * InMemoryAudioRecorder – captures microphone PCM directly into RAM via
 * expo-audio, accumulates samples on the worklet thread, and returns a
 * Float32Array. No audio file is ever written to disk.
 */

import {
    AudioModule,
    type AudioRecorder,
    type AudioSample,
    type RecordingOptions,
    type RecordingStatus,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
} from 'expo-audio';
import type { EventSubscription } from 'expo-modules-core';
import { makeShareable, runOnJS } from 'react-native-worklets';
import { InMemoryAudioRecorderException } from '@/Exception';
import { appLogger, type LoggerInterface } from './Logger';

export class InMemoryAudioRecorder {
    private static readonly SAMPLE_RATE = 16000;

    private static readonly DEFAULT_OPTIONS: Partial<RecordingOptions> = {
        sampleRate: InMemoryAudioRecorder.SAMPLE_RATE,
        numberOfChannels: 1,
        ios: {
            audioQuality: 0,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: true,
            outputFormat: 'LINEARPCM',
        },
        android: {
            audioEncoder: 'aac',
            outputFormat: 'default',
        },
        extension: '.wav',
        bitRate: 128_000,
    };

    /** Safety margin added to durationMs before we consider the capture timed out. */
    private static readonly TIMEOUT_MARGIN_MS = 2_000;

    private readonly handleCaptureComplete = (buffer: Float32Array): void => {
        this.logger.debug('Capture complete');
        this.cleanup();
        this.resolveCapture?.(buffer);
        this.clearPromisePointers();
    };

    private readonly handleError = (error: unknown): void => {
        const wrapped = error instanceof Error ? error : new Error(String(error));
        this.logger.error('Error during capture', { error: wrapped });
        this.cleanup();
        this.rejectCapture?.(wrapped);
        this.clearPromisePointers();
    };

    private readonly handleTimeout = (): void => {
        this.logger.warn('Capture timed out');
        this.cleanup();
        this.rejectCapture?.(new InMemoryAudioRecorderException('Recording timed out', 'RECORDING_TIMEOUT'));
        this.clearPromisePointers();
    };

    // ---------------------------------------------------------------- private

    private isCapturing = false;

    public constructor(
        private readonly logger: LoggerInterface,
        private recorder: AudioRecorder = {} as AudioRecorder,
        private subscription: EventSubscription = {} as EventSubscription,
        private timeoutId: ReturnType<typeof setTimeout> = {} as ReturnType<typeof setTimeout>,
        private resolveCapture: (data: Float32Array) => void = () => {},
        private rejectCapture: (error: Error) => void = () => {},
    ) {}

    /**
     * Capture `durationMs` of 16 kHz mono PCM into memory and return it.
     * Rejects if a capture is already running, permissions are denied,
     * or the hardware doesn't deliver enough samples in time.
     */
    public async capture(durationMs: number): Promise<Float32Array> {
        if (durationMs <= 0) {
            throw new InMemoryAudioRecorderException('Duration must be greater than 0ms', 'INVALID_DURATION');
        }

        if (this.isCapturing) {
            throw new InMemoryAudioRecorderException('A capture is already in progress', 'CONCURRENT_CAPTURE');
        }

        await this.ensurePermissions();
        this.isCapturing = true;
        this.recorder = new AudioModule.AudioRecorder(InMemoryAudioRecorder.DEFAULT_OPTIONS);

        return new Promise<Float32Array>((resolve, reject) => {
            this.resolveCapture = resolve;
            this.rejectCapture = reject;

            this.setupAudioListener(durationMs);
            this.startRecording(durationMs);
        });
    }

    private cleanup(): void {
        this.isCapturing = false;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = {} as ReturnType<typeof setTimeout>;
        }

        if (this.subscription) {
            this.subscription.remove();
            this.subscription = {} as EventSubscription;
        }

        if (this.recorder) {
            this.recorder.stop().catch((e: unknown) => {
                const error = e instanceof Error ? e : new Error(String(e));
                this.logger.warn(`Error stopping recorder: ${error.message}`);
            });
            this.recorder = {} as AudioRecorder;
        }
    }

    private clearPromisePointers(): void {
        this.resolveCapture = () => {};
        this.rejectCapture = () => {};
    }

    private async ensurePermissions(): Promise<void> {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
            throw new InMemoryAudioRecorderException('Microphone permission denied', 'PERMISSION_DENIED');
        }
        await setAudioModeAsync({ allowsRecording: true });
    }

    private setupAudioListener(durationMs: number): void {
        const requiredSamples = (durationMs / 1_000) * InMemoryAudioRecorder.SAMPLE_RATE;

        const sharedState = makeShareable({
            writePosition: 0,
            buffer: new Float32Array(requiredSamples),
        });

        const onComplete = this.handleCaptureComplete;

        const accumulate = (incomingSamples: Float32Array) => {
            'worklet';
            if (sharedState.writePosition >= requiredSamples) {
                return;
            }

            const remainingSamples = requiredSamples - sharedState.writePosition;
            const count = Math.min(remainingSamples, incomingSamples.length);
            sharedState.buffer.set(incomingSamples.subarray(0, count), sharedState.writePosition);
            sharedState.writePosition += count;

            if (sharedState.writePosition >= requiredSamples) {
                runOnJS(onComplete)(sharedState.buffer);
            }
        };

        this.subscription = this.recorder.addListener('recordingStatusUpdate', (status: RecordingStatus) => {
            const audioSample = (status as RecordingStatus & { audioSample: AudioSample }).audioSample;
            if (audioSample?.channels?.[0]) {
                const frames = audioSample.channels[0].frames;
                if (frames) {
                    accumulate(new Float32Array(frames));
                }
            }
        });
    }

    private startRecording(durationMs: number): void {
        this.recorder
            .prepareToRecordAsync()
            .then(() => {
                this.recorder.record();
                this.logger.debug(`Started capturing for ${durationMs}ms`);
                this.timeoutId = setTimeout(this.handleTimeout, durationMs + InMemoryAudioRecorder.TIMEOUT_MARGIN_MS);
            })
            .catch(this.handleError);
    }
}

export const inMemoryAudioRecorder = new InMemoryAudioRecorder(appLogger);
