import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedProps,
  interpolate,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {ANIMATION} from './AnimationController';

const ICONS = {
  DOCUMENT_TEXT: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M8,12H16V14H8V12M8,16H13V18H8V16Z',
} as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SecureSessionButtonRecordingProps {
  mode: SharedValue<number>;
  spin: SharedValue<number>;
  colorPulse: SharedValue<number>;
  iconColorDark: string;
  iconColorLight: string;
}

export function SecureSessionButtonRecording({
  mode,
  spin,
  colorPulse,
  iconColorDark,
  iconColorLight,
}: SecureSessionButtonRecordingProps): React.JSX.Element {
  const iconSpinStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${spin.value}deg`}],
  }));

  const squareStyle = useAnimatedStyle(() => ({
    opacity: spin.value >= ANIMATION.ROTATION_90_DEGREES && spin.value < ANIMATION.ROTATION_270_DEGREES ? ANIMATION.MODE_IDLE : ANIMATION.MODE_ACTIVE,
  }));

  const lockStyle = useAnimatedStyle(() => ({
    opacity: spin.value >= ANIMATION.ROTATION_90_DEGREES && spin.value < ANIMATION.ROTATION_270_DEGREES ? ANIMATION.MODE_ACTIVE : ANIMATION.MODE_IDLE,
    transform: [{rotate: `${ANIMATION.SPIN_180_DEGREES}deg`}],
  }));

  const recordingIconColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      colorPulse.value,
      [0, 1],
      [iconColorDark, iconColorLight]
    ),
  }));

  const lockIconAnimatedProps = useAnimatedProps(() => ({
    fill: interpolateColor(
      colorPulse.value,
      [0, 1],
      [iconColorDark, iconColorLight]
    ),
  }));

  const recordingOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(mode.value, [0.8, 1], [0, 1]),
  }));

  return (
    <Animated.View style={[styles.recordingContent, recordingOpacity]}>
      <Animated.View style={iconSpinStyle}>
        <Animated.View style={[styles.absoluteCenter, squareStyle]}>
          <Animated.View
            style={[styles.stopShape, recordingIconColorStyle]}
          />
        </Animated.View>

        <Animated.View
          style={[styles.absoluteCenter, lockStyle]}
          pointerEvents="none">
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <AnimatedPath d={ICONS.DOCUMENT_TEXT} animatedProps={lockIconAnimatedProps} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  recordingContent: {
    position: 'absolute',
    width: ANIMATION.ACTIVE_WIDTH,
    height: ANIMATION.ACTIVE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteCenter: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    left: -12,
    top: -12,
  },
  stopShape: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
});
