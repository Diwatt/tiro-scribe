import { useAudioRecording } from '@Service/AudioRecording';
import { observer, useSelector } from '@legendapp/state/react';
import type React from 'react';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppLanguage } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { RecorderState } from '../../../modules/secure-recorder/src';
import { appLogger } from '../../Service/Logger';

const logger = appLogger;

/**
 * Button constants
 */
const BUTTON = {
    height: 56,
    shadowOffsetHeight: 12,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
} as const;

interface Props {
    isRecording?: boolean;
    onPress?: () => void;
    onRecordingChange?: (isRecording: boolean) => void;
    disabled?: boolean;
}

export const SecureSessionButton = observer(
    ({ isRecording: externalIsRecording, onPress: externalOnPress, onRecordingChange, disabled = false }: Props): React.JSX.Element => {
        const theme = useTheme<ExtendedTheme>();
        const { LL } = useAppLanguage();
        const criticalAction = theme.colors.actions.critical;
        const audioRecording = useAudioRecording();

        // useSelector must be called unconditionally (hooks rules)
        const state$ = audioRecording.getState();
        const fromStore = useSelector(() => state$.state.get() === RecorderState.RECORDING);
        const isRecording = externalIsRecording !== undefined ? externalIsRecording : fromStore;

        // Log state changes
        useEffect(() => {
            logger.debug('🔄 [SecureSessionButton] isRecording changed', {
                isRecording,
                externalIsRecording,
                audioRecordingIsRecording: state$.state.get() === RecorderState.RECORDING,
            });
        }, [isRecording, externalIsRecording, state$]);

        // Colors from theme (recording state uses secureSessionButton semantic colors)
        const sessionColors = theme.colors.secureSessionButton;
        const backgroundColor = isRecording ? sessionColors.activeBackground : criticalAction.background;
        const textColor = isRecording ? sessionColors.recordingIconColorLight : criticalAction.text;

        const handlePress = async () => {
            // Read current state directly (not from render-time const) to get latest value
            const currentState$ = audioRecording.getState();
            const currentIsRecording = externalIsRecording !== undefined ? externalIsRecording : currentState$.state.get() === RecorderState.RECORDING;

            logger.debug('👆 [SecureSessionButton] Button pressed', {
                currentIsRecording,
                externalIsRecording,
                audioRecordingIsRecording: currentState$.state.get() === RecorderState.RECORDING,
                hasExternalOnPress: !!externalOnPress,
            });

            if (externalOnPress) {
                externalOnPress();
                return;
            }

            try {
                if (currentIsRecording) {
                    logger.debug('⏹️ [SecureSessionButton] Calling stopRecording');
                    await audioRecording.stopRecording();
                    onRecordingChange?.(false);
                    logger.debug('✅ [SecureSessionButton] stopRecording completed', {
                        newIsRecording: audioRecording.getState().state.get() === RecorderState.RECORDING,
                    });
                } else {
                    logger.debug('▶️ [SecureSessionButton] Calling startRecording');
                    await audioRecording.startRecording();
                    onRecordingChange?.(true);
                    logger.debug('✅ [SecureSessionButton] startRecording completed', {
                        newIsRecording: audioRecording.getState().state.get() === RecorderState.RECORDING,
                    });
                }
            } catch (error) {
                logger.error('❌ [SecureSessionButton] Recording error', {
                    error,
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
            }
        };

        // Extract RGB from shadow color - shadow is a string color
        const shadowColorRgb = criticalAction.shadow ?? theme.colors.shadow;
        return (
            <View style={styles.centerHelper}>
                <View style={[styles.shadowWrapper, { shadowColor: shadowColorRgb }]}>
                    <Pressable
                        style={[styles.container, { backgroundColor }, disabled && { opacity: 0.5 }]}
                        onPress={disabled ? undefined : handlePress}
                        disabled={disabled}
                    >
                        <Text style={[styles.text, { color: textColor }]}>{isRecording ? LL.recordButton.stop() : LL.recordButton.record()}</Text>
                    </Pressable>
                </View>
            </View>
        );
    },
);

const styles = StyleSheet.create({
    centerHelper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shadowWrapper: {
        // Drop shadow for call-to-action button - floating effect
        shadowOffset: { width: 0, height: BUTTON.shadowOffsetHeight },
        shadowOpacity: BUTTON.shadowOpacity,
        shadowRadius: BUTTON.shadowRadius,
        elevation: BUTTON.elevation, // Android shadow
    },
    container: {
        height: BUTTON.height,
        minWidth: 120,
        paddingHorizontal: 24,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
