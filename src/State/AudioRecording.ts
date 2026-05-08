import { computed, type Observable, type ObservableComputed, observable } from '@legendapp/state';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { RecorderState } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { EncounterRecorder } from '@/Service/EncounterRecorder';

dayjs.extend(duration);

/**
 * AudioRecording: State class (ViewModel) for audio recording.
 * 
 * Follows MVVM pattern:
 * - Delegates business logic to EncounterRecorder service
 * - Exposes observable state for UI components
 * - Methods are thin wrappers: call service → update observables
 * - No business logic, validation, or error handling (handled by service)
 * - Duration ticker managed here for UI reactivity only
 */

export class AudioRecording {
    private static readonly DURATION_TICK_MS = 100;

    public readonly state: Observable<RecorderState> = observable(RecorderState.Inactive);
    public readonly filePath: Observable<string | null> = observable(null);
    public readonly durationMs: Observable<number> = observable(0);
    public readonly encounterUuid: Observable<string | null> = observable(null);
    public readonly isPaused: Observable<boolean> = observable(false);

    private readonly _isRecording$: ObservableComputed<boolean>;
    private readonly _formattedDuration$: ObservableComputed<string>;
    private readonly recorder: EncounterRecorder;
    private readonly logger: AppLogger;

    private durationIntervalId: ReturnType<typeof setInterval> | null = null;
    private recordingStartTime: number | null = null;
    private accumulatedDuration = 0;

    public constructor(recorder: EncounterRecorder, logger: AppLogger) {
        this.recorder = recorder;
        this.logger = logger;

        this._isRecording$ = computed(() => {
            return this.state.get() === RecorderState.Recording;
        });

        this._formattedDuration$ = computed(() => {
            return AudioRecording.formatDuration(this.durationMs.get());
        });
    }

    public get isRecording$(): ObservableComputed<boolean> {
        return this._isRecording$;
    }

    public get isPaused$(): ObservableComputed<boolean> {
        return computed(() => this.isPaused.get());
    }

    public get encounterUuid$(): ObservableComputed<string | null> {
        return computed(() => this.encounterUuid.get());
    }

    public get formattedDuration$(): ObservableComputed<string> {
        return this._formattedDuration$;
    }

    public async start(): Promise<void> {
        this.logger.debug('▶️ [AudioRecording] start called');

        try {
            const encounterUuid = await this.recorder.start();
            this.encounterUuid.set(encounterUuid);
            this.state.set(RecorderState.Recording);

            const filePath = await this.recorder.getFilePath();
            this.filePath.set(filePath);

            this.startDurationTicker();

            this.logger.debug('🎙️ [AudioRecording] Recording started', {
                encounterUuid,
                filePath,
            });
        } catch (error: unknown) {
            this.logger.error('❌ [AudioRecording] Failed to start recording', {
                error: this.serializeError(error),
            });
            // Don't re-throw - let State layer handle errors gracefully
            // View layer should not need to catch errors
        }
    }

    public async pause(): Promise<void> {
        if (this.state.get() !== RecorderState.Recording) {
            this.logger.warn('⚠️ [AudioRecording] Cannot pause: not recording');
            return;
        }

        this.logger.debug('⏸️ [AudioRecording] pause called');

        try {
            await this.recorder.pause(this.durationMs.get());
            this.stopDurationTicker();
            this.isPaused.set(true);

            this.logger.debug('📝 [AudioRecording] Recording paused', {
                durationMs: this.durationMs.get(),
            });
        } catch (error: unknown) {
            this.logger.error('❌ [AudioRecording] Failed to pause recording', {
                error: this.serializeError(error),
            });
            // Don't re-throw - let State layer handle errors gracefully
        }
    }

    public async resume(): Promise<void> {
        if (!this.isPaused.get()) {
            this.logger.warn('⚠️ [AudioRecording] Cannot resume: not paused');
            return;
        }

        this.logger.debug('▶️ [AudioRecording] resume called');

        try {
            const filePath = await this.recorder.resume();
            this.filePath.set(filePath);
            this.isPaused.set(false);

            this.startDurationTicker();

            this.logger.debug('🎙️ [AudioRecording] Recording resumed', {
                filePath,
            });
        } catch (error: unknown) {
            this.logger.error('❌ [AudioRecording] Failed to resume recording', {
                error: this.serializeError(error),
            });
            // Don't re-throw - let State layer handle errors gracefully
        }
    }

    public async stop(): Promise<string | null> {
        this.logger.debug('⏹️ [AudioRecording] stop called');

        try {
            this.stopDurationTicker();

            const finalDuration = this.durationMs.get();
            const filePath = await this.recorder.stop(finalDuration);

            this.state.set(RecorderState.Stopped);
            this.isPaused.set(false);
            this.filePath.set(filePath);
            this.durationMs.set(0);
            this.accumulatedDuration = 0;

            this.logger.debug('📝 [AudioRecording] Recording stopped', {
                filePath,
                durationMs: finalDuration,
            });

            return filePath;
        } catch (error: unknown) {
            this.logger.error('❌ [AudioRecording] Failed to stop recording', {
                error: this.serializeError(error),
            });
            // Handle NoActiveRecordingError gracefully - recording may already be stopped
            // Don't re-throw - let State layer handle errors gracefully
            this.state.set(RecorderState.Stopped);
            this.isPaused.set(false);
            this.stopDurationTicker();
            return this.filePath.get();
        }
    }

    public cleanup(): void {
        this.logger.debug('🔴 [AudioRecording] cleanup called');
        this.stopDurationTicker();
        this.recorder.cleanup();

        this.state.set(RecorderState.Inactive);
        this.filePath.set(null);
        this.durationMs.set(0);
        this.encounterUuid.set(null);
        this.isPaused.set(false);
        this.accumulatedDuration = 0;
    }

    private static formatDuration(durationMs: number): string {
        const dur = dayjs.duration(durationMs);
        const hours = dur.hours();

        if (hours > 0) {
            return dur.format('HH:mm:ss');
        }
        return dur.format('mm:ss');
    }

    private startDurationTicker(): void {
        this.stopDurationTicker();
        this.accumulatedDuration = this.durationMs.get();
        this.recordingStartTime = Date.now();
        this.durationIntervalId = setInterval(() => {
            if (this.recordingStartTime !== null) {
                const currentSessionDuration = Date.now() - this.recordingStartTime;
                this.durationMs.set(this.accumulatedDuration + currentSessionDuration);
            }
        }, AudioRecording.DURATION_TICK_MS);
    }

    private stopDurationTicker(): void {
        if (this.durationIntervalId !== null) {
            clearInterval(this.durationIntervalId);
            this.durationIntervalId = null;
        }
        if (this.recordingStartTime !== null) {
            const currentSessionDuration = Date.now() - this.recordingStartTime;
            this.durationMs.set(this.accumulatedDuration + currentSessionDuration);
            this.recordingStartTime = null;
        }
    }

    private serializeError(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null) {
            const errorObj = error as Record<string, unknown>;
            if ('code' in errorObj && 'message' in errorObj) {
                return `Code: ${errorObj.code}, Message: ${errorObj.message}`;
            }
            return JSON.stringify(error);
        }

        return String(error);
    }
}

Container.register(
    AudioRecording,
    () => new AudioRecording(Container.get(EncounterRecorder), Container.get(AppLogger)),
);

/**
 * React hook for accessing the AudioRecording singleton.
 * Components should use this hook to access the audio recording state and methods.
 * 
 * @returns The shared AudioRecording instance
 * 
 * @example
 * ```tsx
 * const audioRecording = useAudioRecording();
 * const isRecording = audioRecording.isRecording;
 * 
 * const handleStart = () => audioRecording.start();
 * ```
 */
export function useAudioRecording(): AudioRecording {
    return Container.get(AudioRecording);
}