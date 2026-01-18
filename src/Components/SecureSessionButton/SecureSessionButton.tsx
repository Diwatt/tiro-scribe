import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { WaveformBackground } from '../WaveformBackground';
import { StylusWritingAnimation } from '../StylusWritingAnimation';
import { BronzeStylusIcon } from '../BronzeStylusIcon';
import type { ExtendedTheme } from '@/theme/AppTheme';
import {
  AnimationController,
  DEFAULT_ANIMATION_CONFIG,
  type AnimationConfig,
} from './AnimationController';

const CONFIG = {
  HEIGHT: 56,
} as const;


const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  isRecording: boolean;
  onPress: () => void;
  animationConfig?: Partial<AnimationConfig>;
}

export function SecureSessionButton({
  isRecording,
  onPress,
  animationConfig = {},
}: Props): React.JSX.Element {
  const theme = useTheme() as ExtendedTheme;
  const colors = theme.colors.secureSessionButton;
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
          startRecording(current);
        } else {
          stopRecording(current);
        }
      }
    }
  );

  React.useEffect(() => {
    isRecordingShared.value = isRecording;
  }, [isRecording]);

  const containerStyle = useAnimatedStyle(() => {
    const rotate = interpolate(mode.value, [0, 1], [0, 180]);
    return {
      width: interpolate(mode.value, [0, 1], [config.morph.idleWidth, config.morph.activeWidth]),
      borderRadius: interpolate(mode.value, [0, 1], [config.morph.idleRadius, config.morph.activeRadius]),
      backgroundColor: interpolateColor(mode.value, [0, 1], [colors.idleBg, colors.activeBg]),
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  const contentWrapperStyle = useAnimatedStyle(() => {
    const rotate = interpolate(mode.value, [0, 1], [0, -180]);
    return { transform: [{ rotate: `${rotate}deg` }] };
  });

  const idleOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(mode.value, [0, 0.2], [1, 0]),
  }));

  const recordingOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(mode.value, [0.8, 1], [0, 1]),
  }));

  return (
    <View style={styles.centerHelper}>
      <AnimatedPressable
        style={[styles.container, containerStyle]}
        onPress={onPress}>
        <Animated.View style={[styles.innerStabilizer, contentWrapperStyle]}>
          {/* IDLE STATE */}
          <Animated.View style={[styles.idleContent, idleOpacity]}>
            <Animated.View style={styles.waveformContainer}>
              <WaveformBackground />
            </Animated.View>
            <View style={styles.iconBox}>
              <BronzeStylusIcon size={24} color={colors.idleTextIconColor} />
            </View>
            <Text
              variant="titleMedium"
              style={[styles.text, { color: colors.idleTextIconColor }]}>
              Start Secure Transcribe
            </Text>
          </Animated.View>

          {/* RECORDING STATE */}
          <Animated.View style={[styles.recordingContent, recordingOpacity]}>
            <StylusWritingAnimation />
          </Animated.View>
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centerHelper: {
    alignItems: 'center',
    justifyContent: 'center',
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
  idleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 8,
    position: 'relative',
  },
  waveformContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.5,
  },
  recordingContent: {
    position: 'absolute',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
