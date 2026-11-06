import { observer, useSelector } from '@legendapp/state/react';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { RecorderState } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { useLocalization } from '@/Localization';
import { useAudioRecording } from '@/State';
import { RecordingStage } from './Session/RecordingStage';

export const RecordingScreen = observer((): React.JSX.Element => {
    const { locale } = useLocalization();
    const { autoStart: autoStartParam } = useLocalSearchParams<{ autoStart?: string }>();
    const autoStart = autoStartParam === 'true';
    const audioRecording = useAudioRecording();
    const logger = Container.get(AppLogger);
    const [startedAt] = useState(() => new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }));
    const isRecording = useSelector(() => audioRecording.state.get() === RecorderState.Recording);
    const isPaused = useSelector(() => audioRecording.isPaused.get());
    const formattedDuration = useSelector(() => audioRecording.formattedDuration$.get());

    useEffect(() => {
        if (autoStart && !isRecording && !isPaused) {
            logger.debug('[RecordingScreen] Auto-starting recording');
            audioRecording.start();
        }
    }, [autoStart, audioRecording, isRecording, isPaused, logger]);

    const handleTogglePause = async (): Promise<void> => {
        if (isPaused) {
            await audioRecording.resume();
            return;
        }
        if (isRecording) {
            await audioRecording.pause();
        }
    };

    const handleStop = async (): Promise<void> => {
        const duration = formattedDuration;
        const endedAt = new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        await audioRecording.stop();
        Container.get(AppRouter).replace(
            `/main/session-saved?duration=${encodeURIComponent(duration)}&range=${encodeURIComponent(`${startedAt} → ${endedAt}`)}`,
        );
    };

    return (
        <RecordingStage
            elapsed={formattedDuration}
            startedAt={startedAt}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onStop={handleStop}
        />
    );
});
