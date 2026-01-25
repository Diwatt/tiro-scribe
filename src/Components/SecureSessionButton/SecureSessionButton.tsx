import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { colord } from 'colord';
import { observer, useSelector } from '@legendapp/state/react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  interpolate,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import type { ExtendedTheme } from '@/theme/AppTheme';
import {
  AnimationController,
  DEFAULT_ANIMATION_CONFIG,
  type AnimationConfig,
} from './AnimationController';
import { useAudioRecording } from '@Service/AudioRecording';
import { SecureSessionButtonIdle } from './SecureSessionButtonIdle';
import { SecureSessionButtonRecording } from './SecureSessionButtonRecording';
import { AppLogger } from '../../Util/Logger';
import { ANIMATION } from './AnimationController';
import { RecorderState } from '../../../modules/secure-recorder/src';

const logger = AppLogger.getInstance();

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

const CONFIG = {
  HEIGHT: BUTTON.HEIGHT,
} as const;

interface Props {
  isRecording?: boolean;
  onPress?: () => void;
  animationConfig?: Partial<AnimationConfig>;
  onRecordingChange?: (isRecording: boolean) => void;
}

export const SecureSessionButton = observer(function SecureSessionButton({
  isRecording: externalIsRecording,
  onPress: externalOnPress,
  animationConfig = {},
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
  const colors = {
    idleBackground: criticalAction.background,
    activeBackground: theme.colors.error,
    idleTextIconColor: criticalAction.text,
    recordingIconColorDark: theme.colors.onError,
    recordingIconColorLight: theme.colors.onError,
  };

  const config: AnimationConfig = {
    morph: { ...DEFAULT_ANIMATION_CONFIG.morph, ...animationConfig.morph },
    iconMorph: {
      ...DEFAULT_ANIMATION_CONFIG.iconMorph,
      ...animationConfig.iconMorph,
    },
    colorPulse: {
      ...DEFAULT_ANIMATION_CONFIG.colorPulse,
      ...animationConfig.colorPulse,
    },
  };

  const mode = useSharedValue(0);
  const spin = useSharedValue(0);
  const colorPulse = useSharedValue(0);
  const isRecordingShared = useSharedValue(isRecording);

  // Logging functions for worklet
  const logAnimationStart = (current: boolean, previous: boolean | null, modeValue: number) => {
    logger.debug('🎬 [SecureSessionButton] Animation: Starting recording', {
      current,
      previous,
      mode: modeValue,
    });
  };

  const logAnimationStop = (current: boolean, previous: boolean | null, modeValue: number) => {
    logger.debug('🎬 [SecureSessionButton] Animation: Stopping recording', {
      current,
      previous,
      mode: modeValue,
    });
  };

  const {startRecording, stopRecording} = useMemo(() => {
    const controller = new AnimationController(mode, spin, colorPulse, config);
    return {
      startRecording: controller.startRecording,
      stopRecording: controller.stopRecording,
    };
  }, [mode, spin, colorPulse, config]);

  useAnimatedReaction(
    () => isRecordingShared.value,
    (current: boolean, previous: boolean | null) => {
      'worklet';
      if (current !== previous) {
        if (current) {
          runOnJS(logAnimationStart)(current, previous, mode.value);
          startRecording(current);
        } else if (previous !== null) {
          // Only stop if we had a previous value (not initial mount)
          runOnJS(logAnimationStop)(current, previous, mode.value);
          stopRecording(current);
        }
      }
    }
  );

  // Update shared value when isRecording changes
  // The observer() wrapper makes this reactive
  useEffect(() => {
    const previousValue = isRecordingShared.value;
    
    logger.debug('🔄 [SecureSessionButton] useEffect - isRecording changed', {
      isRecording,
      externalIsRecording,
      previousSharedValue: previousValue,
      willUpdate: previousValue !== isRecording,
    });
    
    if (previousValue !== isRecording) {
      isRecordingShared.value = isRecording;
    }
  }, [isRecording, externalIsRecording]);

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
      // Update shared value immediately for responsive animation
      const newState = !currentIsRecording;
      logger.debug('🔄 [SecureSessionButton] External press - updating shared value', {
        from: currentIsRecording,
        to: newState,
      });
      isRecordingShared.value = newState;
      externalOnPress();
      return;
    }

    try {
      // Update shared value immediately for responsive animation
      const newRecordingState = !currentIsRecording;
      logger.debug('🔄 [SecureSessionButton] Internal press - updating shared value', {
        from: currentIsRecording,
        to: newRecordingState,
      });
      isRecordingShared.value = newRecordingState;

      if (currentIsRecording) {
        logger.debug('⏹️ [SecureSessionButton] Calling stopRecording');
        await audioRecording.stopRecording();
        onRecordingChange?.(false);
        logger.debug('✅ [SecureSessionButton] stopRecording completed', {
          newIsRecording: audioRecording.isRecording$.get(),
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
      // Revert animation on error - use current actual state
      const errorState$ = audioRecording.getState();
      const actualState = externalIsRecording !== undefined 
        ? externalIsRecording 
        : errorState$.state.get() === RecorderState.RECORDING;
      isRecordingShared.value = actualState;
    }
  };

  const containerStyle = useAnimatedStyle(() => {
    const rotate = interpolate(mode.value, [ANIMATION.MODE_IDLE, ANIMATION.MODE_ACTIVE], [ANIMATION.MODE_IDLE, ANIMATION.SPIN_180_DEGREES]);
    return {
      width: config.morph.activeWidth, // Keep same size
      borderRadius: config.morph.activeRadius, // Keep same radius
      backgroundColor: interpolateColor(mode.value, [ANIMATION.MODE_IDLE, ANIMATION.MODE_ACTIVE], [colors.idleBackground, colors.activeBackground]),
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  const contentWrapperStyle = useAnimatedStyle(() => {
    const rotate = interpolate(mode.value, [ANIMATION.MODE_IDLE, ANIMATION.MODE_ACTIVE], [ANIMATION.MODE_IDLE, -ANIMATION.SPIN_180_DEGREES]);
    return { transform: [{ rotate: `${rotate}deg` }] };
  });

  // Extract RGB from shadow color - use a darker version for more visible shadow
  const shadowColorRgb = useMemo(() => {
    // Darken the shadow color for better visibility
    const darkerShadow = colord(criticalAction.shadow).darken(0.3).toRgb();
    return `rgb(${darkerShadow.r}, ${darkerShadow.g}, ${darkerShadow.b})`;
  }, [criticalAction.shadow]);

  return (
    <View style={styles.centerHelper}>
      <View style={[styles.shadowWrapper, { shadowColor: shadowColorRgb }]}>
        <AnimatedPressable
          style={[styles.container, containerStyle]}
          onPress={handlePress}>
        <Animated.View style={[styles.innerStabilizer, contentWrapperStyle]}>
          <SecureSessionButtonIdle
            mode={mode}
            iconColor={colors.idleTextIconColor}
          />
          <SecureSessionButtonRecording
            mode={mode}
            spin={spin}
            colorPulse={colorPulse}
            iconColorDark={colors.recordingIconColorDark}
            iconColorLight={colors.recordingIconColorLight}
          />
        </Animated.View>
      </AnimatedPressable>
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
    shadowOffset: { width: ANIMATION.MODE_IDLE, height: BUTTON.SHADOW_OFFSET_HEIGHT },
    shadowOpacity: BUTTON.SHADOW_OPACITY,
    shadowRadius: BUTTON.SHADOW_RADIUS,
    elevation: BUTTON.ELEVATION, // Android shadow
  },
  container: {
    height: CONFIG.HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerStabilizer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
});
