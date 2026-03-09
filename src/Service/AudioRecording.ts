import { computed, type Observable, type ObservableComputed, observable } from '@legendapp/state';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { RecorderState } from '../../modules/secure-recorder/src';

/**
 * Temporary stub implementation of the old AudioRecording service.
 *
 * The real recording logic has been deferred until later in development,
 * so this class simply tracks state and emits noop values.  Components can
 * continue importing `useAudioRecording()` without crashing the bundle.
 *
 * When it's time to reintroduce full audio support we can either restore the
 * previous implementation or build a new abstraction around the modern
 * `SecureRecorder` APIs.
 */
export interface AudioRecordingState {
    state: RecorderState;
    filePath: string | null;
    /** Elapsed recording duration in milliseconds. 0 when not recording. */
    durationMs: number;
}

const DURATION_TICK_MS = 100;

class AudioRecording {
    private _isRecording$: ObservableComputed<boolean>;
    private durationIntervalId: ReturnType<typeof setInterval> | null = null;
    private logger: AppLogger;
    private recordingStartTime: number | null = null;
    private state$: Observable<AudioRecordingState>;

    constructor(logger: AppLogger = Container.get(AppLogger)) {
        this.logger = logger;
        this.state$ = observable<AudioRecordingState>({
            state: RecorderState.Inactive,
            filePath: null,
            durationMs: 0,
        });

        this._isRecording$ = computed(() => {
            return this.state$.state.get() === RecorderState.Recording;
        });
    }

    cleanup(): void {
        this.logger.debug('🔴 [AudioRecording] cleanup called (stub)');
        this.stopDurationTicker();
    }

    get durationMs(): number {
        return this.state$.durationMs.get();
    }

    getFilePath(): string | null {
        return this.state$.filePath.get();
    }

    getState(): Observable<AudioRecordingState> {
        return this.state$;
    }

    get isRecording(): boolean {
        return this.state$.state.get() === RecorderState.Recording;
    }

    get isRecording$(): ObservableComputed<boolean> {
        return this._isRecording$;
    }

    async startRecording(): Promise<void> {
        this.logger.warn('▶️ [AudioRecording] startRecording called on stub');
        this.state$.state.set(RecorderState.Recording);
        this.state$.filePath.set(null);
        this.startDurationTicker();
    }

    async startStreaming(_onFrame: (pcm: Float32Array) => void): Promise<void> {
        this.logger.warn('▶️ [AudioRecording] startStreaming called on stub');
        // no-op
    }

    async stopRecording(): Promise<string> {
        this.logger.warn('⏹️ [AudioRecording] stopRecording called on stub');
        this.state$.state.set(RecorderState.Stopped);
        this.stopDurationTicker();
        return '/dev/null';
    }

    async stopStreaming(): Promise<void> {
        this.logger.warn('⏹️ [AudioRecording] stopStreaming called on stub');
        // no-op
    }

    private startDurationTicker(): void {
        this.stopDurationTicker();
        this.recordingStartTime = Date.now();
        this.state$.durationMs.set(0);
        this.durationIntervalId = setInterval(() => {
            if (this.recordingStartTime !== null) {
                this.state$.durationMs.set(Date.now() - this.recordingStartTime);
            }
        }, DURATION_TICK_MS);
    }

    private stopDurationTicker(): void {
        if (this.durationIntervalId !== null) {
            clearInterval(this.durationIntervalId);
            this.durationIntervalId = null;
        }
        if (this.recordingStartTime !== null) {
            this.state$.durationMs.set(Date.now() - this.recordingStartTime);
            this.recordingStartTime = null;
        }
    }
}

export const audioRecording = new AudioRecording();

export function useAudioRecording(): AudioRecording {
    return audioRecording;
}
