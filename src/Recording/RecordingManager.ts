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

export class RecordingManager {
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

    public initialize(recorder: AudioRecorder): void {
        this.recorder = recorder;
    }

    public setIsRecording(isRecording: boolean): void {
        this.isRecording = isRecording;
    }

    /**
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
     * @throws {RecorderNotInitializedError} If recorder is not initialized
     * @throws {RecordingPermissionError} If permission is not granted
     */
    public async startRecording(): Promise<void> {
        if (!this.recorder) {
            throw new RecorderNotInitializedError();
        }

        if (!this.hasPermission) {
            await this.requestPermission();
        }

        await this.recorder.prepareToRecordAsync();
        this.recorder.record();
        this.isRecording = true;
    }

    /**
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
        const uri = this.recorder.uri ?? this.recorder.getStatus().url;

        if (!uri) {
            throw new RecordingUriUnavailableError();
        }

        const recordingsDir = new Directory(Paths.document, 'recordings');
        recordingsDir.create({idempotent: true});

        const fileName = `recording_${Date.now()}.m4a`;
        const destination = new File(recordingsDir, fileName);

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

    public reset(): void {
        this.isRecording = false;
        this.recordingUri = null;
    }
}

const recordingManager = observable(new RecordingManager());

export function useRecordingManager(): RecordingManager {
    return useSelector(() => recordingManager.peek());
}
