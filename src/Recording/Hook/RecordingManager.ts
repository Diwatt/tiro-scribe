/**
 * RecordingManager - OOP class for audio recording state management using Legend-State
 *
 * Manages audio recording state and operations with reactive observables
 */

import {observable} from '@legendapp/state';
import {useSelector} from '@legendapp/state/react';
import {File, Directory, Paths} from 'expo-file-system';
import {
    AudioRecorder,
    getRecordingPermissionsAsync,
    requestRecordingPermissionsAsync,
} from 'expo-audio';
import {
    RecordingPermissionError,
    RecorderNotInitializedError,
    NoActiveRecordingError,
    RecordingUriUnavailableError,
    FileOperationError,
} from '@/Exception';
import {log} from '@/Util/Logger';

/**
 * RecordingManager - Class for managing audio recording state
 *
 * Properties are automatically observable when the instance is wrapped in observable()
 */
export class RecordingManager {
    // Permission status constants
    private static readonly PERMISSION_GRANTED = 'granted' as const;

    public isRecording: boolean;
    public recordingUri: string | null;
    public hasPermission: boolean;

    private recorder: AudioRecorder | null = null;

    public constructor() {
        this.isRecording = false;
        this.recordingUri = null;
        this.hasPermission = false;
    }

    /**
     * Initialize the recorder (must be called from a React component context)
     * @param recorder - The AudioRecorder instance from useAudioRecorder hook
     */
    public initialize(recorder: AudioRecorder): void {
        this.recorder = recorder;
    }

    /**
     * Update recording state (called from hook when recorder state changes)
     * @param isRecording - Current recording status
     */
    public setIsRecording(isRecording: boolean): void {
        this.isRecording = isRecording;
    }

    /**
     * Request audio recording permission
     * Follows the Fullscreen API pattern (e.g., requestFullscreen)
     * @throws {RecordingPermissionError} If permission is denied
     */
    public async requestPermission(): Promise<void> {
        const {status} = await getRecordingPermissionsAsync();
        if (status === RecordingManager.PERMISSION_GRANTED) {
            this.hasPermission = true;
            return;
        }

        const {granted} = await requestRecordingPermissionsAsync();
        this.hasPermission = granted;
        if (!granted) {
            throw new RecordingPermissionError('Audio recording permission denied');
        }
    }

    /**
     * Start audio recording
     * @throws {RecorderNotInitializedError} If recorder is not initialized
     * @throws {RecordingPermissionError} If permission is not granted
     */
    public async startRecording(): Promise<void> {
        if (!this.recorder) {
            throw new RecorderNotInitializedError();
        }

        // Ensure permissions are granted
        if (!this.hasPermission) {
            await this.requestPermission();
        }

        // Prepare and start recording
        await this.recorder.prepareToRecordAsync();
        this.recorder.record();
        this.isRecording = true;
    }

    /**
     * Stop audio recording and save file
     * @throws {RecorderNotInitializedError} If recorder is not initialized
     * @throws {NoActiveRecordingError} If no recording is active
     * @throws {RecordingUriUnavailableError} If recording URI is unavailable
     * @throws {FileOperationError} If file operation fails
     */
    public async stopRecording(): Promise<void> {
        if (!this.recorder) {
            throw new RecorderNotInitializedError();
        }

        if (!this.isRecording) {
            throw new NoActiveRecordingError();
        }

        await this.recorder.stop();
        
        // Get URI from recorder - use the uri property or getStatus().url
        const uri = this.recorder.uri ?? this.recorder.getStatus().url;

        if (!uri) {
            throw new RecordingUriUnavailableError();
        }

        // Move recording to a permanent location using new File API
        const recordingsDir = new Directory(Paths.document, 'recordings');
        recordingsDir.create({idempotent: true});

        const fileName = `recording_${Date.now()}.m4a`;
        const destination = new File(recordingsDir, fileName);

        // Use new File API to move the recording
        try {
            const sourceFile = new File(uri);
            sourceFile.move(destination);
        } catch (fileErr) {
            throw new FileOperationError(
                'Failed to move recording file',
                fileErr instanceof Error ? fileErr : undefined,
            );
        }

        this.recordingUri = destination.uri;
        this.isRecording = false;
        log.info('Recording saved to:', destination.uri);
    }

    /**
     * Reset the store state
     */
    public reset(): void {
        this.isRecording = false;
        this.recordingUri = null;
    }
}

// Create observable instance (internal only)
const recordingManager = observable(new RecordingManager());

// Hook for React components - returns the reactive instance
export function useRecordingManager(): RecordingManager {
    return useSelector(() => recordingManager.peek());
}
