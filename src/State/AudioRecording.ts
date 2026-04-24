import { computed, type Observable, type ObservableComputed, observable } from '@legendapp/state';
import { RecorderState } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { EncounterRecorder } from '@/Service/EncounterRecorder';

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
    private readonly recorder: EncounterRecorder;
    private readonly logger: AppLogger;

    private durationIntervalId: ReturnType<typeof setInterval> | null = null;
    private recordingStartTime: number | null = null;

    public constructor(recorder: EncounterRecorder, logger: AppLogger) {
        this.recorder = recorder;
        this.logger = logger;

        this._isRecording$ = computed(() => {
            return this.state.get() === RecorderState.Recording;
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

    public async start(): Promise<void> {
        this.logger.debug('▶️ [AudioRecording] start called');

        try {
            const encounterUuid = await this.recorder.startRecording();
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
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    public async pause(): Promise<void> {
        if (this.state.get() !== RecorderState.Recording) {
            this.logger.warn('⚠️ [AudioRecording] Cannot pause: not recording');
            return;
        }

        this.logger.debug('⏸️ [AudioRecording] pause called');

        try {
            await this.recorder.pauseRecording(this.durationMs.get());
            this.stopDurationTicker();
            this.isPaused.set(true);

            this.logger.debug('📝 [AudioRecording] Recording paused', {
                durationMs: this.durationMs.get(),
            });
        } catch (error: unknown) {
            this.logger.error('❌ [AudioRecording] Failed to pause recording', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    public async resume(): Promise<void> {
        if (!this.isPaused.get()) {
            this.logger.warn('⚠️ [AudioRecording] Cannot resume: not paused');
            return;
        }

        this.logger.debug('▶️ [AudioRecording] resume called');

        try {
            const filePath = await this.recorder.resumeRecording();
            this.filePath.set(filePath);
            this.isPaused.set(false);

            this.startDurationTicker();

            this.logger.debug('🎙️ [AudioRecording] Recording resumed', {
                filePath,
            });
        } catch (error: unknown) {
            this.logger.error('❌ [AudioRecording] Failed to resume recording', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    public async stop(): Promise<string> {
        this.logger.debug('⏹️ [AudioRecording] stop called');

        try {
            this.stopDurationTicker();

            const filePath = await this.recorder.stopRecording(this.durationMs.get());

            this.state.set(RecorderState.Stopped);
            this.isPaused.set(false);
            this.filePath.set(filePath);
            this.durationMs.set(0);

            this.logger.debug('📝 [AudioRecording] Recording stopped', {
                filePath,
                durationMs: this.durationMs.get(),
            });

            return filePath;
        } catch (error: unknown) {
            this.logger.error('❌ [AudioRecording] Failed to stop recording', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
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
    }

    private startDurationTicker(): void {
        this.stopDurationTicker();
        this.recordingStartTime = Date.now();
        this.durationIntervalId = setInterval(() => {
            if (this.recordingStartTime !== null) {
                this.durationMs.set(Date.now() - this.recordingStartTime);
            }
        }, AudioRecording.DURATION_TICK_MS);
    }

    private stopDurationTicker(): void {
        if (this.durationIntervalId !== null) {
            clearInterval(this.durationIntervalId);
            this.durationIntervalId = null;
        }
        if (this.recordingStartTime !== null) {
            this.durationMs.set(Date.now() - this.recordingStartTime);
            this.recordingStartTime = null;
        }
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