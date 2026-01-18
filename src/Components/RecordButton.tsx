import React from 'react';
import {StyleSheet, ViewStyle} from 'react-native';
import {FAB, useTheme} from 'react-native-paper';
import {Mic, MicOff, Square} from 'lucide-react-native';

export interface RecordButtonProps {
    isRecording: boolean;
    isPaused?: boolean;
    onPress: () => void;
    disabled?: boolean;
    style?: ViewStyle;
    small?: boolean;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function RecordButton({
    isRecording,
    isPaused = false,
    onPress,
    disabled = false,
    style,
    small = false,
    position = 'bottom-right',
}: RecordButtonProps): React.JSX.Element {
    const theme = useTheme();

    const getIcon = () => {
        if (isPaused) {
            return MicOff;
        }
        if (isRecording) {
            return Square;
        }
        return Mic;
    };

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
    const backgroundColor = isRecording
        ? theme.colors.error
        : theme.colors.primary;
    const iconColor = isRecording
        ? theme.colors.onError
        : theme.colors.onPrimary;

    return (
        <FAB
            icon={({size: iconSize}) => (
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
                {backgroundColor},
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
