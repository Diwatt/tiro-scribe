import React from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, interpolate, type SharedValue} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {ANIMATION} from './AnimationController';

const ICONS = {
  DOCUMENT_TEXT: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M8,12H16V14H8V12M8,16H13V18H8V16Z',
} as const;

interface SecureSessionButtonIdleProps {
  mode: SharedValue<number>;
  iconColor: string;
}

export function SecureSessionButtonIdle({
  mode,
  iconColor,
}: SecureSessionButtonIdleProps): React.JSX.Element {
  const idleOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(mode.value, [ANIMATION.MODE_IDLE, ANIMATION.MODE_TRANSITION_START], [ANIMATION.MODE_ACTIVE, ANIMATION.MODE_IDLE]),
  }));

  return (
    <Animated.View style={[styles.idleContent, idleOpacity]}>
      <View style={styles.iconBox}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path d={ICONS.DOCUMENT_TEXT} fill={iconColor} />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  idleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
