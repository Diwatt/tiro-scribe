import { observer, useSelector } from '@legendapp/state/react';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecorderState } from 'secure-recorder';
import { AppLogger } from '@/Core/AppLogger';
import { AppRouter } from '@/Core/AppRouter';
import { Container } from '@/Core/Container';
import { useAudioRecording } from '@/State';
import type { ExtendedTheme } from '@/theme/AppTheme';

const LOGGER = Container.get(AppLogger);

const TIMER = {
    fontSize: 48,
    fontWeight: '700' as const,
} as const;

export const RecordingScreen = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { autoStart: autoStartParam } = useLocalSearchParams<{ autoStart?: string }>();
    const autoStart = autoStartParam === 'true';
    const audioRecording = useAudioRecording();
    const insets = useSafeAreaInsets();

    // Use selector for observable state
    const isRecording = useSelector(() => audioRecording.state.get() === RecorderState.Recording);
    const isPaused = useSelector(() => audioRecording.isPaused.get());
    const formattedDuration = useSelector(() => audioRecording.formattedDuration$.get());

    // Auto-start recording if autoStart is true
    useEffect(() => {
        if (autoStart && !isRecording && !isPaused) {
            LOGGER.debug('🚀 [RecordingScreen] Auto-starting recording', { autoStart });
            audioRecording.start();
        }
    }, [autoStart, audioRecording, isRecording, isPaused]);

    const handlePause = async () => {
        if (isPaused) {
            LOGGER.debug('▶️ [RecordingScreen] Resume requested');
            await audioRecording.resume();
        } else if (isRecording) {
            LOGGER.debug('⏸️ [RecordingScreen] Pause requested');
            await audioRecording.pause();
        }
    };

    const handleStop = async () => {
        LOGGER.debug('⏹️ [RecordingScreen] Stop recording requested');
        await audioRecording.stop();
        Container.get(AppRouter).back();
    };

    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            {/* Timer display */}
            <View style={STYLES.timerContainer}>
                <Text style={[STYLES.timer, { color: theme.colors.onBackground }]}>{formattedDuration}</Text>
            </View>

            {/* Control buttons */}
            <View style={[STYLES.controlsContainer, { bottom: insets.bottom + 100 }]}>
                {/* Pause/Resume button */}
                <IconButton
                    icon={isRecording ? 'pause' : 'play'}
                    iconColor={theme.colors.primary}
                    size={32}
                    onPress={handlePause}
                    style={[STYLES.iconButton, { backgroundColor: theme.colors.surfaceVariant }]}
                />

                {/* Stop button */}
                <IconButton
                    icon="stop"
                    iconColor={theme.colors.onSurfaceVariant}
                    size={32}
                    onPress={handleStop}
                    style={[STYLES.iconButton, { backgroundColor: theme.colors.errorContainer }]}
                />
            </View>
        </View>
    );
});

const STYLES = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timer: {
        fontSize: TIMER.fontSize,
        fontWeight: TIMER.fontWeight,
        fontFamily: 'System',
    },
    controlsContainer: {
        position: 'absolute',
        flexDirection: 'row',
        gap: 24,
        marginBottom: 20,
    },
    iconButton: {
        borderRadius: 32,
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
