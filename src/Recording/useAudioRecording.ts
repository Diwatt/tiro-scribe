import {useEffect} from 'react';
import {
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
} from 'expo-audio';
import {useRecordingManager} from './RecordingManager';

export function useAudioRecording() {
    const manager = useRecordingManager();
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder);

    useEffect(() => {
        manager.initialize(recorder);
    }, [recorder, manager]);

    useEffect(() => {
        // expo-audio type definitions may be incomplete
        const status = (recorderState as {status?: string}).status;
        const isRecording = status === 'recording';
        manager.setIsRecording(isRecording);
    }, [recorderState, manager]);

    useEffect(() => {
        manager.requestPermission();
    }, [manager]);

    return manager;
}
