import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { ExtendedTheme } from '@/theme/AppTheme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StylusWritingAnimationProps {}

const WIDTH = 54;
const HEIGHT = 32;
const MID_Y = HEIGHT / 2;
const STEPS = 120;

const getSignaturePos = (t: number) => {
  'worklet';
  const freqBase = Math.PI * 2;
  const loops = 9.0;

  const xWobble = Math.sin(t * freqBase * loops - Math.PI / 2) * (WIDTH / loops * 0.2);
  const x = Math.pow(t, 1.1) * WIDTH + xWobble;

  const yMainLoops = Math.cos(t * freqBase * loops) * (HEIGHT * 0.15);
  const yBaselineLet = Math.sin(t * freqBase * 1.5) * (HEIGHT * 0.05);
  const envelope = Math.sin(t * Math.PI);

  const y = MID_Y + (yMainLoops + yBaselineLet) * envelope;
  return { x, y };
};

const getSquarePos = (t: number) => {
  'worklet';
  const size = 20;
  const half = size / 2;
  const cx = WIDTH / 2;
  const cy = MID_Y;

  let x, y;

  if (t < 0.25) {
    const localT = t / 0.25;
    x = cx - half + localT * size;
    y = cy - half;
  } else if (t < 0.5) {
    const localT = (t - 0.25) / 0.25;
    x = cx + half;
    y = cy - half + localT * size;
  } else if (t < 0.75) {
    const localT = (t - 0.5) / 0.25;
    x = cx + half - localT * size;
    y = cy + half;
  } else {
    const localT = (t - 0.75) / 0.25;
    x = cx - half;
    y = cy + half - localT * size;
  }

  return { x, y };
};

const lerp = (v0: number, v1: number, t: number) => {
  'worklet';
  return v0 * (1 - t) + v1 * t;
};

export function StylusWritingAnimation({}: StylusWritingAnimationProps): React.JSX.Element {
  const theme = useTheme() as ExtendedTheme;
  const color = theme.colors.secureSessionButton.recordingIconColorDark;

  const morphValue = useSharedValue(0);

  useEffect(() => {
    morphValue.value = withRepeat(
      withSequence(
        withDelay(2000, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) })),
        withDelay(2000, withTiming(0, { duration: 600, easing: Easing.inOut(Easing.cubic) }))
      ),
      -1
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    let d = '';
    const morph = morphValue.value;

    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;

      const sigPos = getSignaturePos(t);
      const sqPos = getSquarePos(t);

      const x = lerp(sigPos.x, sqPos.x, morph);
      const y = lerp(sigPos.y, sqPos.y, morph);

      if (i === 0) {
        d += `M ${x} ${y}`;
      } else {
        d += ` L ${x} ${y}`;
      }
    }

    if (morph > 0.9) {
      d += ' Z';
    }

    return {
      d: d,
    };
  });

  return (
    <View style={{ width: WIDTH, height: HEIGHT }}>
      <Svg width={WIDTH} height={HEIGHT} style={StyleSheet.absoluteFill}>
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
