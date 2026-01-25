import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useAnimatedReaction,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { WaveformBackground } from '../WaveformBackground';
import type { ExtendedTheme } from '@/theme/AppTheme';
import {
  AnimationController,
  DEFAULT_ANIMATION_CONFIG,
  type AnimationConfig,
} from './AnimationController';
import { SecureRecorder, RecorderState } from '../../../modules/secure-recorder/src/index';
import { log } from '@/Util/Logger';

const CONFIG = {
  HEIGHT: 56,
} as const;

const ICONS = {
  LOCK: 'M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13C13.11,13 14,13.89 14,15C14,16.1 13.11,17 12,17M18,8H17V6C17,3.24 14.76,1 12,1C9.24,1 7,3.24 7,6V8H6C4.9,8 4,8.9 4,10V20C4,21.1 4.9,22 6,22H18C19.1,22 20,21.1 20,20V10C20,8.9 19.1,8 18,8M12,6C13.1,6 14,6.9 14,8V8H10V8C10,6.9 10.9,6 12,6Z',
} as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  isRecording?: boolean;
  onPress?: () => void;
  animationConfig?: Partial<AnimationConfig>;
  onRecordingChange?: (isRecording: boolean) => void;
}

export function SecureSessionButton({
  isRecording: externalIsRecording,
  onPress: externalOnPress,
  animationConfig = {},
  onRecordingChange,
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

  // Internal recording state
  const [internalIsRecording, setInternalIsRecording] = useState(false);
  const recorderRef = useRef<SecureRecorder | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Use external isRecording if provided, otherwise use internal state
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : internalIsRecording;

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

  // We avoid creating SecureRecorder at mount to prevent the iOS JSI getObject
  // assert when expo-modules-core creates the module's JS object too early. When
  // externalOnPress is provided, the parent owns recording and we never touch
  // SecureRecorder. Otherwise we create it on first Start (see ensureRecorder).
  useEffect(() => {
    return () => {
      recorderRef.current = null;
    };
  }, []);

  // Update shared value when isRecording changes
  useEffect(() => {
    isRecordingShared.value = isRecording;
  }, [isRecording]);

  async function ensureRecorder(): Promise<void> {
    const sessionId = `session-${Date.now()}`;
    sessionIdRef.current = sessionId;
    const recorder = new SecureRecorder(sessionId);
    recorder.onerror = (error) => {
      log.error('Recording error:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    };
    recorderRef.current = recorder;
  }

  const handlePress = async () => {
    if (externalOnPress) {
      externalOnPress();
      return;
    }

    try {
      if (isRecording) {
        const recorder = recorderRef.current;
        if (!recorder) {
          log.error('Recorder not initialized');
          return;
        }
        log.info('Stopping recording...');
        const filePath = await recorder.stop();
        setInternalIsRecording(false);
        onRecordingChange?.(false);
        log.info('Recording stopped successfully:', {
          sessionId: sessionIdRef.current,
          filePath,
          timestamp: new Date().toISOString(),
        });
        console.log('📹 Recording stopped:', {
          sessionId: sessionIdRef.current,
          filePath,
          timestamp: new Date().toISOString(),
        });
      } else {
        if (recorderRef.current?.state === RecorderState.STOPPED) {
          recorderRef.current = null;
        }
        if (!recorderRef.current) await ensureRecorder();
        log.info('Starting recording...', { sessionId: sessionIdRef.current });
        await recorderRef.current!.start();
        setInternalIsRecording(true);
        onRecordingChange?.(true);
        log.info('Recording started successfully');
      }
    } catch (error) {
      log.error('Failed to toggle recording:', error);
      console.error('❌ Recording error:', error);
    }
  };

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

  const iconSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const squareStyle = useAnimatedStyle(() => ({
    opacity: spin.value >= 90 && spin.value < 270 ? 0 : 1,
  }));

  const lockStyle = useAnimatedStyle(() => ({
    opacity: spin.value >= 90 && spin.value < 270 ? 1 : 0,
    transform: [{ rotate: '180deg' }],
  }));

  const recordingIconColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      colorPulse.value,
      [0, 1],
      [colors.recordingIconColorDark, colors.recordingIconColorLight]
    ),
  }));

  const lockIconAnimatedProps = useAnimatedProps(() => ({
    fill: interpolateColor(
      colorPulse.value,
      [0, 1],
      [colors.recordingIconColorDark, colors.recordingIconColorLight]
    ),
  }));

  return (
    <View style={styles.centerHelper}>
      <AnimatedPressable
        style={[styles.container, containerStyle]}
        onPress={handlePress}>
        <Animated.View style={[styles.innerStabilizer, contentWrapperStyle]}>
          {/* IDLE STATE */}
          <Animated.View style={[styles.idleContent, idleOpacity]}>
            <Animated.View style={styles.waveformContainer}>
              <WaveformBackground />
            </Animated.View>
            <View style={styles.iconBox}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d={ICONS.LOCK} fill={colors.idleTextIconColor} />
              </Svg>
            </View>
            <Text
              variant="titleMedium"
              style={[styles.text, { color: colors.idleTextIconColor }]}>
              Start Secure Transcribe
            </Text>
          </Animated.View>

          {/* RECORDING STATE */}
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
                  <AnimatedPath d={ICONS.LOCK} animatedProps={lockIconAnimatedProps} />
                </Svg>
              </Animated.View>
            </Animated.View>
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
