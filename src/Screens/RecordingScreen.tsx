/**
 * Recording Screen
 * Minimal full-screen modal for secure recording sessions
 * Black background with stop button positioned like Home screen
 */

import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {observer} from '@legendapp/state/react';
import {SecureTranscribeButton} from '@/Components';
import {useAudioRecording} from '@Service/AudioRecording';
import {RootStackScreenProps} from '@/Navigation/types';
import {AppLogger} from '@/Util/Logger';

const logger = AppLogger.getInstance();

export const RecordingScreen = observer(function RecordingScreen({
    route,
    navigation,
}: RootStackScreenProps<'Recording'>): React.JSX.Element {
    const {autoStart} = route.params;
    const audioRecording = useAudioRecording();
    const insets = useSafeAreaInsets();
    
    // Calculate button position: Home screen bottom (30) + tab bar height (~60) + safe area bottom
    const TAB_BAR_HEIGHT = 60;
    const HOME_BUTTON_BOTTOM = 30;
    const buttonBottom = HOME_BUTTON_BOTTOM + TAB_BAR_HEIGHT + insets.bottom;

    // Auto-start recording if autoStart is true
    useEffect(() => {
        if (autoStart && !audioRecording.isRecording) {
            logger.debug('🚀 [RecordingScreen] Auto-starting recording', {autoStart});
            audioRecording.startRecording().catch((err) => {
                logger.error('❌ [RecordingScreen] Auto-start failed:', {error: err});
            });
        }
    }, [autoStart]);

    const handleStop = async () => {
        logger.debug('⏹️ [RecordingScreen] Stop recording requested');
        await audioRecording.stopRecording();
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <View style={[styles.buttonContainer, {bottom: buttonBottom}]}>
                <SecureTranscribeButton
                    onPress={handleStop}
                    isRecording={true}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    buttonContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        alignItems: 'center',
    },
});
