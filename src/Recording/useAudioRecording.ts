import {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {SecureRecorder, RecorderState} from '../../modules/secure-recorder/src/index';
import {v4 as uuidv4} from 'uuid';

export function useAudioRecording() {
    const [state, setState] = useState<RecorderState>(RecorderState.INACTIVE);
    const [recordingFilePath, setRecordingFilePath] = useState<string | null>(null);
    const recorderRef = useRef<SecureRecorder | null>(null);

    useEffect(() => {
        return () => {
            recorderRef.current = null;
        };
    }, []);

    async function ensureRecorder(): Promise<void> {
        const recorder = new SecureRecorder(uuidv4());
        recorder.onerror = (e) => console.error('Recording error:', e);
        recorderRef.current = recorder;
        setState(recorder.state);
        setRecordingFilePath(recorder.filePath);
    }

    const startRecording = useCallback(async () => {
        try {
            if (recorderRef.current?.state === RecorderState.STOPPED) {
                recorderRef.current = null;
            }
            if (!recorderRef.current) await ensureRecorder();
            await recorderRef.current!.start();
            setState(recorderRef.current!.state);
            setRecordingFilePath(recorderRef.current!.filePath);
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }, []);

    const stopRecording = useCallback(async () => {
        if (!recorderRef.current) {
            throw new Error('Recorder not initialized');
        }

        try {
            const filePath = await recorderRef.current.stop();
            setState(recorderRef.current.state);
            setRecordingFilePath(recorderRef.current.filePath);
            return filePath;
        } catch (error) {
            console.error('Failed to stop recording:', error);
            throw error;
        }
    }, []);

    return useMemo(
        () => ({
            isRecording: state === RecorderState.RECORDING,
            recordingFilePath,
            state,
            startRecording,
            stopRecording,
        }),
        [state, recordingFilePath, startRecording, stopRecording],
    );
}
