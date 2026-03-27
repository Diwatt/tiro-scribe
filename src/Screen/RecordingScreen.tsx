import { useAudioRecording } from '@Service/AudioRecording';
import { observer } from '@legendapp/state/react';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SecureSessionButton } from '@/Components';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { AppRouter } from '@/Core/AppRouter';
import type { ExtendedTheme } from '@/theme/AppTheme';

const LOGGER = Container.get(AppLogger);

export const RecordingScreen = observer((): React.JSX.Element => {
    const theme = useTheme<ExtendedTheme>();
    const { autoStart: autoStartParam } = useLocalSearchParams<{ autoStart?: string }>();
    const autoStart = autoStartParam === 'true';
    const audioRecording = useAudioRecording();
    const insets = useSafeAreaInsets();

    // Calculate button position: Home screen bottom (30) + tab bar height (~60) + safe area bottom
    const tabBarHeight = 60;
    const homeButtonBottom = 30;
    const buttonBottom = homeButtonBottom + tabBarHeight + insets.bottom;

    // Auto-start recording if autoStart is true
    useEffect(() => {
        if (autoStart && !audioRecording.isRecording) {
            LOGGER.debug('🚀 [RecordingScreen] Auto-starting recording', { autoStart });
            audioRecording.startRecording().catch((err) => {
                LOGGER.error('❌ [RecordingScreen] Auto-start failed:', { error: err });
            });
        }
    }, [autoStart, audioRecording]);

    const handleStop = async () => {
        LOGGER.debug('⏹️ [RecordingScreen] Stop recording requested');
        await audioRecording.stopRecording();
        Container.get(AppRouter).back();
    };
    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <View style={[STYLES.buttonContainer, { bottom: buttonBottom }]}>
                <SecureSessionButton onPress={handleStop} isRecording={true} />
            </View>
        </View>
    );
});

const STYLES = StyleSheet.create({
    container: {
        flex: 1,
    },
    buttonContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        alignItems: 'center',
    },
});
