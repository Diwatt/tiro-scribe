import React, { useEffect } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { observer, useSelector } from '@legendapp/state/react';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { useAudioRecording } from '@Service/AudioRecording';
import { AppLogger } from '../../Util/Logger';
import { RecorderState } from '../../../modules/secure-recorder/src';

const logger = AppLogger.getInstance();

/**
 * Button constants
 */
const BUTTON = {
  HEIGHT: 56,
  SHADOW_OFFSET_HEIGHT: 12,
  SHADOW_OPACITY: 0.6,
  SHADOW_RADIUS: 24,
  ELEVATION: 16,
} as const;

interface Props {
  isRecording?: boolean;
  onPress?: () => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

export const SecureSessionButton = observer(function SecureSessionButton({
  isRecording: externalIsRecording,
  onPress: externalOnPress,
  onRecordingChange,
}: Props): React.JSX.Element {
  const theme = useTheme() as ExtendedTheme;
  const criticalAction = (theme.colors as any).actions.critical;
  const audioRecording = useAudioRecording();

  // Use external isRecording if provided, otherwise use useSelector for reactivity
  // useSelector ensures observer() tracks the observable properly
  const state$ = audioRecording.getState();
  const isRecording = externalIsRecording !== undefined 
    ? externalIsRecording 
    : useSelector(() => state$.state.get() === RecorderState.RECORDING);

  // Log state changes
  useEffect(() => {
    logger.debug('🔄 [SecureSessionButton] isRecording changed', {
      isRecording,
      externalIsRecording,
      audioRecordingIsRecording: state$.state.get() === RecorderState.RECORDING,
    });
  }, [isRecording, externalIsRecording, state$]);

  // Colors from theme
  const backgroundColor = isRecording ? theme.colors.error : criticalAction.background;
  const textColor = isRecording ? theme.colors.onError : criticalAction.text;

  const handlePress = async () => {
    // Read current state directly (not from render-time const) to get latest value
    const currentState$ = audioRecording.getState();
    const currentIsRecording = externalIsRecording !== undefined 
      ? externalIsRecording 
      : currentState$.state.get() === RecorderState.RECORDING;
    
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
  const shadowColorRgb = criticalAction.shadow || '#000000';

  return (
    <View style={styles.centerHelper}>
      <View style={[styles.shadowWrapper, { shadowColor: shadowColorRgb }]}>
        <Pressable
          style={[styles.container, { backgroundColor }]}
          onPress={handlePress}>
          <Text style={[styles.text, { color: textColor }]}>
            {isRecording ? 'Stop' : 'Record'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  centerHelper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowWrapper: {
    // Drop shadow for call-to-action button - floating effect
    shadowOffset: { width: 0, height: BUTTON.SHADOW_OFFSET_HEIGHT },
    shadowOpacity: BUTTON.SHADOW_OPACITY,
    shadowRadius: BUTTON.SHADOW_RADIUS,
    elevation: BUTTON.ELEVATION, // Android shadow
  },
  container: {
    height: BUTTON.HEIGHT,
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
