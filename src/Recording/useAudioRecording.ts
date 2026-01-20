import {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {SecureRecorder, type RecorderState} from '../../modules/secure-recorder/src/index';
import {v4 as uuidv4} from 'uuid';

export function useAudioRecording() {
    const [state, setState] = useState<RecorderState>('inactive');
    const [recordingFilePath, setRecordingFilePath] = useState<string | null>(null);
    const recorderRef = useRef<SecureRecorder | null>(null);

    // Initialize recorder and set up event handlers
    useEffect(() => {
        // Check permission first
        const initialize = async () => {
            try {
                const hasPermission = await SecureRecorder.hasPermission();
                if (!hasPermission) {
                    const granted = await SecureRecorder.requestPermission();
                    if (!granted) {
                        console.warn('Microphone permission not granted');
                        return;
                    }
                }

                // Create recorder instance
                const sessionId = uuidv4();
                const recorder = new SecureRecorder(sessionId);

                // Set up event handlers
                recorder.onstatuschange = (event) => {
                    setState(event.state);
                    setRecordingFilePath(event.filePath);
                };

                recorder.onerror = (error) => {
                    console.error('Recording error:', error);
                };

                recorderRef.current = recorder;

                // Sync initial state
                setState(recorder.state);
                setRecordingFilePath(recorder.filePath);
            } catch (error) {
                console.error('Failed to initialize recording:', error);
            }
        };

        initialize();

        return () => {
            // Cleanup
            if (recorderRef.current) {
                recorderRef.current.dispose();
                recorderRef.current = null;
            }
        };
    }, []);

    const startRecording = useCallback(async () => {
        if (!recorderRef.current) {
            throw new Error('Recorder not initialized');
        }

        try {
            await recorderRef.current.start();
            // State will be updated via event handler
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
            // State will be updated via event handler
            return filePath;
        } catch (error) {
            console.error('Failed to stop recording:', error);
            throw error;
        }
    }, []);

    return useMemo(
        () => ({
            isRecording: state === 'recording',
            recordingFilePath,
            state,
            startRecording,
            stopRecording,
        }),
        [state, recordingFilePath, startRecording, stopRecording],
    );
}
