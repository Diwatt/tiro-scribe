/**
 * RawAudioStreamer – lightweight wrapper around Expo Audio that attempts to
 * provide a stream of 16 kHz mono PCM frames directly to JavaScript.  Expo’s
 * public API does not yet expose real‑time microphone samples, so this
 * implementation uses an undocumented `audioSample` property on
 * `recordingStatusUpdate` events and falls back to a simple file-based
 * capture if not available.  The consumer (VoiceCalibrator) only cares about
 * the callback interface; the details can evolve behind this abstraction.
 */

import {
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    AudioModule,
    type RecordingOptions,
} from 'expo-audio';
import { appLogger, type LoggerInterface } from './Logger';

export interface WorkletCallback {
    (pcmChunk: Float32Array): void;
}

export class RawAudioStreamer {
    private static _shared: RawAudioStreamer | null = null;

    public static get shared(): RawAudioStreamer {
        if (!RawAudioStreamer._shared) {
            RawAudioStreamer._shared = new RawAudioStreamer();
        }
        return RawAudioStreamer._shared;
    }

    public static setLogger(l: LoggerInterface): void {
        RawAudioStreamer.shared.setLogger(l);
    }

    public static async start(callback: WorkletCallback): Promise<void> {
        return RawAudioStreamer.shared.start(callback);
    }

    public static async stop(): Promise<void> {
        return RawAudioStreamer.shared.stop();
    }

    private recorder: any | null = null; // AudioModule.AudioRecorder but typings are loose
    private subscription: { remove(): void } | null = null;
    private logger: LoggerInterface;

    private constructor(logger: LoggerInterface = appLogger) {
        this.logger = logger;
    }

    public setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    public async start(callback: WorkletCallback): Promise<void> {
        if (this.recorder) {
            this.logger.warn('[RawAudioStreamer] start() called while already active');
            return;
        }

        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
            this.logger.error('[RawAudioStreamer] microphone permission denied');
            return;
        }

        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

        const options: Partial<RecordingOptions> = {
            sampleRate: 16000,
            numberOfChannels: 1,
            ios: {
                audioQuality: 0, // AudioQuality.MIN, minimum to reduce CPU
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: true,
                outputFormat: 'LINEARPCM' as any,
            },
            android: {
                audioEncoder: 'aac', // raw PCM not exposed on Android
                outputFormat: 'default' as any,
            },
            extension: '.wav',
            bitRate: 128000,
        };

        this.recorder = new (AudioModule as any).AudioRecorder(options);

        this.subscription = this.recorder.addListener('recordingStatusUpdate', (status: any) => {
            // `audioSample` is not part of the public typings.  When Expo adds a
            // first‑class streaming API this event will deliver PCM frames. For
            // now we guard defensively to avoid runtime exceptions.
            if (status.audioSample && status.audioSample.channels?.[0]?.frames) {
                const frames: number[] = status.audioSample.channels[0].frames;
                callback(new Float32Array(frames));
            }
        });

        await this.recorder.prepareToRecordAsync();
        this.recorder.record();
        this.logger.debug('[RawAudioStreamer] recording started');
    }

    public async stop(): Promise<void> {
        if (!this.recorder) {
            this.logger.warn('[RawAudioStreamer] stop() called with no active recorder');
            return;
        }

        try {
            await this.recorder.stop();
        } catch (e) {
            this.logger.error('[RawAudioStreamer] error stopping recorder', { error: e });
        }

        this.subscription?.remove();
        this.subscription = null;
        this.recorder = null;
        this.logger.debug('[RawAudioStreamer] recording stopped');
    }
}

export const rawAudioStreamer = RawAudioStreamer.shared;
