/**
 * RecordButton Component
 * Reusable Floating Action Button for recording actions
 * Uses React Native Paper FAB with Lucide React Native icons
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { FAB, useTheme } from 'react-native-paper';
import { Mic, MicOff, Square } from 'lucide-react-native';

export interface RecordButtonProps {
  /**
   * Whether recording is currently active
   */
  isRecording: boolean;
  /**
   * Whether recording is paused
   */
  isPaused?: boolean;
  /**
   * Callback when button is pressed
   */
  onPress: () => void;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Custom style for the FAB container
   */
  style?: ViewStyle;
  /**
   * Whether to use small size FAB
   * @default false
   */
  small?: boolean;
  /**
   * Position of the FAB
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

/**
 * RecordButton - Floating Action Button for recording
 *
 * Displays different icons based on recording state:
 * - Mic icon when not recording (ready to start)
 * - Square icon when recording (ready to stop)
 * - MicOff icon when paused (if pause functionality is implemented)
 *
 * @example
 * ```tsx
 * <RecordButton
 *   isRecording={isRecording}
 *   onPress={handleRecordPress}
 *   disabled={!permissionsGranted}
 * />
 * ```
 */
export const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  isPaused = false,
  onPress,
  disabled = false,
  style,
  small = false,
  position = 'bottom-right',
}) => {
  const theme = useTheme();

  // Determine icon based on state
  const getIcon = () => {
    if (isPaused) {
      return MicOff;
    }
    if (isRecording) {
      return Square;
    }
    return Mic;
  };

  // Determine label based on state
  const getLabel = () => {
    if (isPaused) {
      return 'Resume Recording';
    }
    if (isRecording) {
      return 'Stop Recording';
    }
    return 'Start Recording';
  };

  const IconComponent = getIcon();
  const label = getLabel();

  // Determine background color based on state
  const backgroundColor = isRecording
    ? theme.colors.error
    : theme.colors.primary;

  // Icon color (contrast color for visibility)
  const iconColor = isRecording
    ? theme.colors.onError
    : theme.colors.onPrimary;

  return (
    <FAB
      icon={({ size: iconSize }) => (
        <IconComponent size={iconSize} color={iconColor} />
      )}
      label={label}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.fab,
        position === 'bottom-right' && styles.bottomRight,
        position === 'bottom-left' && styles.bottomLeft,
        position === 'top-right' && styles.topRight,
        position === 'top-left' && styles.topLeft,
        { backgroundColor },
        style,
      ]}
      small={small}
      color={iconColor}
      accessibilityLabel={label}
      accessibilityHint={
        isRecording
          ? 'Double tap to stop recording'
          : 'Double tap to start recording'
      }
      accessibilityRole="button"
      accessibilityState={{
        disabled,
        selected: isRecording,
      }}
    />
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    margin: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  topLeft: {
    top: 0,
    left: 0,
  },
});
