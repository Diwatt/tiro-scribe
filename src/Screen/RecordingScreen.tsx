import { useAudioRecording } from '@/State';
import { observer, useSelector } from '@legendapp/state/react';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { RecorderState } from 'secure-recorder';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, useTheme } from 'react-native-paper';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { AppRouter } from '@/Core/AppRouter';
import type { ExtendedTheme } from '@/theme/AppTheme';

const LOGGER = Container.get(AppLogger);

const TIMER = {
    fontSize: 48,
    fontWeight: '700' as const,
} as const;

/**
 * Formats duration in milliseconds to HH:MM:SS format.
 */
function formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const RecordingScreen = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { autoStart: autoStartParam } = useLocalSearchParams<{ autoStart?: string }>();
    const autoStart = autoStartParam === 'true';
    const audioRecording = useAudioRecording();
    const insets = useSafeAreaInsets();

    // Use selector for observable state
    const isRecording = useSelector(() => audioRecording.state.get() === RecorderState.Recording);
    const isPaused = useSelector(() => audioRecording.isPaused.get());
    const durationMs = useSelector(() => audioRecording.durationMs.get());

    // Auto-start recording if autoStart is true
    useEffect(() => {
        if (autoStart && !isRecording && !isPaused) {
            LOGGER.debug('🚀 [RecordingScreen] Auto-starting recording', { autoStart });
            audioRecording.start().catch((err: unknown) => {
                LOGGER.error('❌ [RecordingScreen] Auto-start failed:', {
                    errorMessage: err instanceof Error ? err.message : String(err),
                    errorName: err instanceof Error ? err.constructor.name : typeof err,
                });
            });
        }
    }, [autoStart, audioRecording, isRecording, isPaused]);

    const handlePause = async () => {
        if (isRecording) {
            LOGGER.debug('⏸️ [RecordingScreen] Pause requested');
            await audioRecording.pause();
        } else if (isPaused) {
            LOGGER.debug('▶️ [RecordingScreen] Resume requested');
            await audioRecording.resume();
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
                <Text style={[STYLES.timer, { color: theme.colors.onBackground }]}>
                    {formatDuration(durationMs)}
                </Text>
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