import {
  SharedValue,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

/**
 * Animation constants
 */
export const ANIMATION = {
  MORPH_DURATION: 400,
  IDLE_WIDTH: 240,
  ACTIVE_WIDTH: 56,
  IDLE_RADIUS: 16,
  ACTIVE_RADIUS: 28,
  ICON_MORPH_DELAY: 2000,
  ICON_MORPH_DURATION: 500,
  COLOR_PULSE_DURATION: 750,
  SPIN_180_DEGREES: 180,
  SPIN_360_DEGREES: 360,
  SPIN_ZERO: 0,
  SPIN_INFINITE_REPEAT: -1,
  ICON_MORPH_DELAY_ADJUSTMENT: 500,
  ROTATION_90_DEGREES: 90,
  ROTATION_270_DEGREES: 270,
  MODE_IDLE: 0,
  MODE_ACTIVE: 1,
  MODE_TRANSITION_START: 0.2,
  MODE_TRANSITION_END: 0.8,
} as const;

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
    duration: ANIMATION.MORPH_DURATION,
    idleWidth: ANIMATION.IDLE_WIDTH,
    activeWidth: ANIMATION.ACTIVE_WIDTH,
    idleRadius: ANIMATION.IDLE_RADIUS,
    activeRadius: ANIMATION.ACTIVE_RADIUS,
  },
  iconMorph: {
    delay: ANIMATION.ICON_MORPH_DELAY,
    duration: ANIMATION.ICON_MORPH_DURATION,
  },
  colorPulse: {
    duration: ANIMATION.COLOR_PULSE_DURATION,
  },
};

export class AnimationController {
  // Bound worklet functions that capture instance state
  public readonly startRecording: (isRecording: boolean) => void;
  public readonly stopRecording: (isRecording: boolean) => void;

  constructor(
    mode: SharedValue<number>,
    spin: SharedValue<number>,
    colorPulse: SharedValue<number>,
    config: AnimationConfig
  ) {
    // Create bound worklet functions that capture values via local refs
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
            withTiming(ANIMATION.SPIN_180_DEGREES, {
              duration: configRef.iconMorph.duration,
              easing: Easing.inOut(Easing.cubic),
            })
          ),
          withDelay(
            configRef.iconMorph.delay - ANIMATION.ICON_MORPH_DELAY_ADJUSTMENT,
            withTiming(ANIMATION.SPIN_360_DEGREES, {
              duration: configRef.iconMorph.duration,
              easing: Easing.inOut(Easing.cubic),
            })
          ),
          withTiming(ANIMATION.SPIN_ZERO, { duration: ANIMATION.SPIN_ZERO })
        ),
        ANIMATION.SPIN_INFINITE_REPEAT,
        false
      );

      colorPulseRef.value = withRepeat(
        withTiming(ANIMATION.MODE_ACTIVE, {
          duration: configRef.colorPulse.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        ANIMATION.SPIN_INFINITE_REPEAT,
        true
      );
    }) as (isRecording: boolean) => void;

    this.stopRecording = (() => {
      'worklet';
      // Cancel ongoing animations
      cancelAnimation(modeRef);
      cancelAnimation(spinRef);
      cancelAnimation(colorPulseRef);
      // Reset values immediately
      spinRef.value = ANIMATION.SPIN_ZERO;
      colorPulseRef.value = ANIMATION.MODE_IDLE;
      // Animate mode back to 0
      modeRef.value = withTiming(ANIMATION.MODE_IDLE, {
        duration: configRef.morph.duration,
        easing: Easing.inOut(Easing.ease),
      });
    }) as (isRecording: boolean) => void;
  }
}
