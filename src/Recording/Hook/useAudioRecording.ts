/**
 * useAudioRecording - Hook that returns RecordingManager instance
 *
 * Returns the singleton observable RecordingManager instance
 */

import {useEffect} from 'react';
import {
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
} from 'expo-audio';
import {useRecordingManager} from './RecordingManager';

/**
 * Hook for audio recording management
 *
 * Returns the singleton RecordingManager instance with reactive state.
 * Components using this hook should be wrapped with observer() from @legendapp/state/react
 * for proper reactivity.
 *
 * @example
 * ```tsx
 * const audioRecording = useAudioRecording();
 *
 * useEffect(() => {
 *   audioRecording.requestPermission();
 * }, []);
 *
 * // In observer component:
 * const isRecording = audioRecording.isRecording;
 * ```
 */
export function useAudioRecording() {
    // Get the singleton observable manager instance
    const manager = useRecordingManager();

    // Initialize expo-audio recorder (must be called in component)
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder);

    // Initialize the manager with recorder instance
    useEffect(() => {
        manager.initialize(recorder);
    }, [recorder, manager]);

    // Sync recorder state with manager state
    useEffect(() => {
        // Access recorder state - expo-audio recorderState has a status property
        // Type definition may not be complete, so we access it safely
        const status = (recorderState as {status?: string}).status;
        const isRecording = status === 'recording';
        manager.setIsRecording(isRecording);
    }, [recorderState, manager]);

    // Request permissions on mount
    useEffect(() => {
        manager.requestPermission();
    }, [manager]);

    return manager;
}
