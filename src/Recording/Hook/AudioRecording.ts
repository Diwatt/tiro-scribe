/**
 * Custom hook for audio recording functionality
 *
 * This hook manages the audio recording lifecycle and integrates
 * with the AudioProcessing for on-device processing.
 */

import {useState, useCallback} from 'react';
import {AudioProcessing} from '@Service';
import {useAppStore} from '@Store/AppStore';
import {ProcessingPayload} from '@Model/Type';

interface UseAudioRecordingReturn {
    isRecording: boolean;
    isProcessing: boolean;
    error: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    processRecording: (audioPath: string) => Promise<ProcessingPayload | null>;
}

export function useAudioRecording(
    audioProcessingService: AudioProcessing,
): UseAudioRecordingReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {currentSessionId, sessionStartDate, addToQueue, setProcessing} =
        useAppStore();

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setIsRecording(true);
            // TODO: Implement native audio recording start
            // await AudioRecorder.startRecording();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to start recording',
            );
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(async () => {
        try {
            setIsRecording(false);
            // TODO: Implement native audio recording stop
            // const audioPath = await AudioRecorder.stopRecording();
            // return audioPath;
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to stop recording',
            );
        }
    }, []);

    const processRecording = useCallback(
        async (audioPath: string): Promise<ProcessingPayload | null> => {
            if (!currentSessionId || !sessionStartDate) {
                setError('No active session. Please start a session first.');
                return null;
            }

            try {
                setIsProcessing(true);
                setProcessing(true);
                setError(null);

                const payload = await audioProcessingService.processAudio(
                    audioPath,
                    currentSessionId,
                    sessionStartDate,
                );

                // Add to processing queue for offline sync
                addToQueue(payload);

                return payload;
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : 'Failed to process audio';
                setError(errorMessage);
                return null;
            } finally {
                setIsProcessing(false);
                setProcessing(false);
            }
        },
        [
            currentSessionId,
            sessionStartDate,
            audioProcessingService,
            addToQueue,
            setProcessing,
        ],
    );

    return {
        isRecording,
        isProcessing,
        error,
        startRecording,
        stopRecording,
        processRecording,
    };
}
