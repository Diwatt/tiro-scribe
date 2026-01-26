/**
 * Audio Recording - OOP class for audio recording management using Legend-State
 *
 * Provides reactive state for recording status and file paths
 */

import {observable, Observable, computed, ObservableComputed} from '@legendapp/state';
import {SecureRecorder, RecorderState} from '../../modules/secure-recorder/src/index';
import {v4 as uuidv4} from 'uuid';
import {AppLogger, LoggerInterface} from '../Util/Logger';

export interface AudioRecordingState {
    state: RecorderState;
    filePath: string | null;
    /** Elapsed recording duration in milliseconds. 0 when not recording. */
    durationMs: number;
}

/**
 * AudioRecording - Singleton class for managing audio recording
 * 
 * Uses Legend-State observables for reactive state management
 * with an OOP interface
 */
const DURATION_TICK_MS = 100;

class AudioRecording {
    private state$: Observable<AudioRecordingState>;
    private _isRecording$: ObservableComputed<boolean>;
    private recorder: SecureRecorder | null = null;
    private loggerInstance: LoggerInterface;
    private recordingStartTime: number | null = null;
    private durationIntervalId: ReturnType<typeof setInterval> | null = null;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.loggerInstance = logger;
        this.state$ = observable<AudioRecordingState>({
            state: RecorderState.INACTIVE,
            filePath: null,
            durationMs: 0,
        });
        // Create computed observable once - it will track state changes
        this._isRecording$ = computed((): boolean => {
            return this.state$.state.get() === RecorderState.RECORDING;
        });
    }

    /**
     * Get the observable state for use in React components
     */
    getState(): Observable<AudioRecordingState> {
        return this.state$;
    }

    /**
     * Get current recording file path
     */
    getFilePath(): string | null {
        return this.state$.filePath.get();
    }

    /**
     * Get snapshot of whether currently recording
     */
    get isRecording(): boolean {
        return this.state$.state.get() === RecorderState.RECORDING;
    }

    /**
     * Get observable for whether currently recording (reactive)
     * Returns the computed observable that tracks state changes
     */
    get isRecording$(): ObservableComputed<boolean> {
        return this._isRecording$;
    }

    /**
     * Current recording duration in milliseconds. 0 when not recording.
     */
    get durationMs(): number {
        return this.state$.durationMs.get();
    }

    /**
     * Start the duration ticker. Call when recording starts.
     */
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

    /**
     * Stop the duration ticker and set final duration. Call when recording stops.
     */
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

    /**
     * Set up event handlers for the recorder
     */
    private setupEventHandlers(recorder: SecureRecorder): void {
        recorder.onerror = (e) => {
            this.loggerInstance.error('❌ [AudioRecording] Recording error:', {
                code: e.code,
                message: e.message,
                details: e.details,
            });
        };

        recorder.onstatuschange = (event) => {
            this.loggerInstance.info('📊 [AudioRecording] Status changed:', {
                state: event.state,
                previousState: this.state$.state.get(),
                sessionId: event.sessionId,
                filePath: event.filePath,
                reason: event.reason,
            });

            const wasRecording = this.state$.state.get() === RecorderState.RECORDING;

            // Event handlers automatically update observable state
            this.state$.state.set(event.state);
            if (event.filePath) {
                this.state$.filePath.set(event.filePath);
            }

            // Start/stop duration timer with recording state
            if (event.state === RecorderState.RECORDING) {
                this.startDurationTicker();
            } else if (wasRecording) {
                this.stopDurationTicker();
            }
        };
    }

    /**
     * Ensure recorder exists, creating it if needed
     */
    private async ensureRecorder(): Promise<void> {
        if (this.recorder?.state === RecorderState.STOPPED) {
            this.loggerInstance.debug('🔄 [AudioRecording] Recorder is STOPPED, creating new instance');
            // Dispose old recorder to remove event listeners
            this.recorder.dispose();
            this.recorder = null;
        }

        if (!this.recorder) {
            this.loggerInstance.debug('🆕 [AudioRecording] No recorder exists, creating new one');
            const sessionId = uuidv4();
            this.loggerInstance.debug('🎙️ [AudioRecording] Creating new SecureRecorder', {
                sessionId,
            });

            const recorder = new SecureRecorder(sessionId);
            this.setupEventHandlers(recorder);
            this.recorder = recorder;

            this.loggerInstance.debug('✅ [AudioRecording] Recorder created:', {
                sessionId,
                initialState: recorder.state,
                filePath: recorder.filePath,
            });
        }
    }

    /**
     * Start recording
     */
    async startRecording(): Promise<void> {
        this.loggerInstance.debug('▶️ [AudioRecording] startRecording called', {
            currentState: this.state$.state.get(),
            hasRecorder: !!this.recorder,
            recorderState: this.recorder?.state,
        });

        try {
            await this.ensureRecorder();

            const recorder = this.recorder!;
            this.loggerInstance.info('🚀 [AudioRecording] Starting recording...', {
                sessionId: recorder.sessionId,
                currentState: recorder.state,
            });

            await recorder.start();

            const newState = recorder.state;
            const newFilePath = recorder.filePath;

            this.loggerInstance.info('✅ [AudioRecording] Recording started successfully!', {
                state: newState,
                filePath: newFilePath,
                sessionId: recorder.sessionId,
            });

            this.state$.state.set(newState);
            this.state$.filePath.set(newFilePath);
            if (newState === RecorderState.RECORDING) {
                this.startDurationTicker();
            }
        } catch (error) {
            this.loggerInstance.error('❌ [AudioRecording] Failed to start recording:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }

    /**
     * Stop recording
     * @returns The file path of the recorded file
     */
    async stopRecording(): Promise<string> {
        this.loggerInstance.debug('⏹️ [AudioRecording] stopRecording called', {
            hasRecorder: !!this.recorder,
            recorderState: this.recorder?.state,
        });
        
        if (!this.recorder) {
            const error = new Error('Recorder not initialized');
            this.loggerInstance.error('❌ [AudioRecording] Cannot stop: recorder not initialized');
            throw error;
        }

        try {
            const recorder = this.recorder;
            const sessionId = recorder.sessionId;
            const currentFilePath = recorder.filePath;
            
            this.loggerInstance.info('🛑 [AudioRecording] Stopping recording...', {
                sessionId,
                currentState: recorder.state,
                currentFilePath,
            });
            
            const filePath = await recorder.stop();
            const finalState = recorder.state;
            
            this.loggerInstance.info('✅ [AudioRecording] Recording stopped successfully!', {
                state: finalState,
                filePath,
                sessionId,
            });
            
            this.state$.state.set(finalState);
            this.state$.filePath.set(filePath);
            this.stopDurationTicker();
            return filePath;
        } catch (error) {
            this.loggerInstance.error('❌ [AudioRecording] Failed to stop recording:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }

    /**
     * Cleanup recorder resources
     */
    cleanup(): void {
        this.loggerInstance.debug('🔴 [AudioRecording] Cleanup: disposing recorder');
        this.stopDurationTicker();
        if (this.recorder) {
            this.recorder.dispose();
            this.recorder = null;
        }
    }
}

// Export singleton instance
export const audioRecording = new AudioRecording();

/**
 * Hook for audio recording management
 * 
 * Returns the AudioRecording class instance directly.
 * Components using this hook should be wrapped with observer() from @legendapp/state/react
 * for proper reactivity when accessing observables.
 * 
 * @example
 * ```tsx
 * const audioRecording = useAudioRecording();
 * 
 * useEffect(() => {
 *   audioRecording.startRecording();
 * }, []);
 * ```
 */
export function useAudioRecording(): AudioRecording {
    return audioRecording;
}
