import {
  SharedValue,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

export interface AnimationConfig {
  morph: {
    duration: number;
    idleWidth: number;
    activeWidth: number;
    idleRadius: number;
    activeRadius: number;
  };
  iconMorph: {
    delay: number;
    duration: number;
  };
  colorPulse: {
    duration: number;
  };
}

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  morph: {
    duration: 400,
    idleWidth: 240,
    activeWidth: 56,
    idleRadius: 16,
    activeRadius: 28,
  },
  iconMorph: {
    delay: 2000,
    duration: 500,
  },
  colorPulse: {
    duration: 750,
  },
};

export class AnimationController {
  private mode: SharedValue<number>;
  private spin: SharedValue<number>;
  private colorPulse: SharedValue<number>;
  private config: AnimationConfig;

  // Bound worklet functions that capture instance state
  public readonly startRecording: (isRecording: boolean) => void;
  public readonly stopRecording: (isRecording: boolean) => void;

  constructor(
    mode: SharedValue<number>,
    spin: SharedValue<number>,
    colorPulse: SharedValue<number>,
    config: AnimationConfig
  ) {
    this.mode = mode;
    this.spin = spin;
    this.colorPulse = colorPulse;
    this.config = config;

    // Create bound worklet functions that capture 'this' values
    // These are created once and can be safely called from worklets
    const modeRef = mode;
    const spinRef = spin;
    const colorPulseRef = colorPulse;
    const configRef = config;

    this.startRecording = (() => {
      'worklet';
      modeRef.value = withTiming(1, {
        duration: configRef.morph.duration,
        easing: Easing.inOut(Easing.ease),
      });

      spinRef.value = withRepeat(
        withSequence(
          withDelay(
            configRef.iconMorph.delay,
            withTiming(180, {
              duration: configRef.iconMorph.duration,
              easing: Easing.inOut(Easing.cubic),
            })
          ),
          withDelay(
            configRef.iconMorph.delay - 500,
            withTiming(360, {
              duration: configRef.iconMorph.duration,
              easing: Easing.inOut(Easing.cubic),
            })
          ),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );

      colorPulseRef.value = withRepeat(
        withTiming(1, {
          duration: configRef.colorPulse.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }) as (isRecording: boolean) => void;

    this.stopRecording = (() => {
      'worklet';
      modeRef.value = withTiming(0, {
        duration: configRef.morph.duration,
        easing: Easing.inOut(Easing.ease),
      });
      spinRef.value = 0;
      colorPulseRef.value = withTiming(0);
    }) as (isRecording: boolean) => void;
  }
}
