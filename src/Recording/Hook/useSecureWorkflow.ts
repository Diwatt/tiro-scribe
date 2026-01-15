/**
 * useSecureWorkflow - Secure AI Pipeline Orchestration Hook for Expo
 *
 * This hook manages the complete secure workflow for on-device AI processing:
 * 1. Audio recording using expo-audio
 * 2. Transcription using sherpa-onnx-react-native
 * 3. Text anonymization using onnxruntime-react-native
 * 4. Biocode extraction using sherpa-onnx-react-native
 * 5. Secure storage using WatermelonDB
 *
 * All processing happens on-device with no network calls.
 */

import {useState, useCallback, useEffect} from 'react';
import * as FileSystem from 'expo-file-system';
import {
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
    getRecordingPermissionsAsync,
    requestRecordingPermissionsAsync,
} from 'expo-audio';
import {Biocode} from '@Service/Biocode';
import {Anonymizer} from '@Service/Anonymizer';
import {AudioProcessing} from '@Service/AudioProcessing';
import {ProcessingPayload} from '@Model/Type';

// Type definitions removed - services now handle ONNX Runtime internally

interface UseSecureWorkflowReturn {
    isRecording: boolean;
    isProcessing: boolean;
    error: string | null;
    recordingUri: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    processRecording: (
        encounterUuid: string,
        sessionStartDate: Date,
    ) => Promise<ProcessingPayload | null>;
    cleanup: () => Promise<void>;
}

interface UseSecureWorkflowOptions {
    biocodeService: Biocode;
    anonymizerService: Anonymizer;
    audioProcessingService: AudioProcessing;
}

export function useSecureWorkflow(
    options: UseSecureWorkflowOptions,
): UseSecureWorkflowReturn {
    const {
        biocodeService,
        anonymizerService,
        audioProcessingService,
    } = options;

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);

    // Initialize audio recorder with high quality preset
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder);

    /**
     * Initialize audio permissions on mount
     */
    useEffect(() => {
        async function initializeAudio() {
            try {
                // Check and request audio permissions
                const {status} = await getRecordingPermissionsAsync();
                if (status !== 'granted') {
                    const {granted} = await requestRecordingPermissionsAsync();
                    if (!granted) {
                        setError('Audio recording permission denied');
                        return;
                    }
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to initialize audio',
                );
            }
        }

        initializeAudio();
    }, []);

    /**
     * Start audio recording
     */
    const startRecording = useCallback(async () => {
        try {
            setError(null);

            // Prepare and start recording
            await recorder.prepareToRecordAsync();
            recorder.record();
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Failed to start recording';
            setError(errorMessage);
        }
    }, [recorder]);

    /**
     * Stop audio recording and return file URI
     */
    const stopRecording = useCallback(async () => {
        if (recorderState.status !== 'recording') {
            setError('No active recording');
            return;
        }

        try {
            await recorder.stop();
            const uri = recorder.getURI();

            if (!uri) {
                throw new Error('Recording URI not available');
            }

            // Move recording to a permanent location
            const recordingDir = `${FileSystem.documentDirectory}recordings/`;
            const recordingExists = await FileSystem.getInfoAsync(recordingDir);

            if (!recordingExists.exists) {
                await FileSystem.makeDirectoryAsync(recordingDir, {
                    intermediates: true,
                });
            }

            const fileName = `recording_${Date.now()}.m4a`;
            const newUri = `${recordingDir}${fileName}`;
            
            // Handle file:// prefix if present
            const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;
            
            await FileSystem.moveAsync({
                from: cleanUri,
                to: newUri,
            });

            setRecordingUri(newUri);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to stop recording';
            setError(errorMessage);
        }
    }, [recorder, recorderState.status]);

    /**
     * Process the recorded audio through the complete AI pipeline
     */
    const processRecording = useCallback(
        async (
            encounterUuid: string,
            sessionStartDate: Date,
        ): Promise<ProcessingPayload | null> => {
            if (!recordingUri) {
                setError('No recording available. Please record audio first.');
                return null;
            }

            if (!audioProcessingService) {
                setError('Audio processing service not initialized');
                return null;
            }

            try {
                setIsProcessing(true);
                setError(null);

                // Process audio through the complete pipeline
                const payload = await audioProcessingService.processAudio(
                    recordingUri,
                    encounterUuid,
                    sessionStartDate,
                );

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
            }
        },
        [recordingUri, audioProcessingService],
    );

    /**
     * Cleanup resources
     */
    const cleanup = useCallback(async () => {
        try {
            // Stop recording if active
            if (recorderState.status === 'recording') {
                await recorder.stop();
            }

            if (recordingUri) {
                // Optionally delete the recording file
                const fileInfo = await FileSystem.getInfoAsync(recordingUri);
                if (fileInfo.exists) {
                    await FileSystem.deleteAsync(recordingUri, {
                        idempotent: true,
                    });
                }
                setRecordingUri(null);
            }

            setIsProcessing(false);
            setError(null);
        } catch (err) {
            console.error('Cleanup error:', err);
        }
    }, [recordingUri, recorder, recorderState.status]);

    return {
        isRecording: recorderState.status === 'recording',
        isProcessing,
        error,
        recordingUri,
        startRecording,
        stopRecording,
        processRecording,
        cleanup,
    };
}
