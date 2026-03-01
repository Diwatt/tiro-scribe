import { AlertCircle, AlertTriangle, Check } from 'lucide-react-native';
import type React from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Surface, Text, useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityStatus } from '@/State/GlobalActivityStatus';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { getStatusColors, readFromStore } from './GlobalActivityBar.utils';

// layout/constants for the bar. grouped into one object to keep the
// top of the file tidy and make it easier to tweak values together.
const BAR_CONFIG = {
    height: 48,
    hiddenOffset: -150, // slide offset when bar is hidden (above screen)
    animationDurationMs: 280,
};

export interface GlobalActivityBarProps {
    /**
     * If supplied the component renders this status/message instead of
     * observing the global store. Useful for stories or localised use.
     * When omitted the bar will read `globalActivityStatus` directly.
     */
    status?: ActivityStatus;
    message?: string;
    /** optional icon node to show; overrides built-in status icon */
    icon?: React.ReactNode;
}

export function GlobalActivityBar(props: GlobalActivityBarProps): React.JSX.Element {
    const { status: propStatus, message: propMessage, icon: propIcon } = props;
    const { status: storeStatus, message: storeMessage, icon: storeIcon } = readFromStore();
    const status = propStatus ?? storeStatus;
    const message = propMessage ?? storeMessage;
    const icon = propIcon ?? storeIcon;

    const theme = useTheme<ExtendedTheme>();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue<number>(BAR_CONFIG.hiddenOffset);

    const isVisible = status !== ActivityStatus.Ready;

    useEffect(() => {
        translateY.value = withTiming(isVisible ? 0 : BAR_CONFIG.hiddenOffset, {
            duration: BAR_CONFIG.animationDurationMs,
        });
    }, [isVisible, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const statusColors = getStatusColors(theme, status);
    const displayMessage = message || '';

    const getStatusIcon = () => {
        if (icon) {
            return icon;
        }

        switch (status) {
            case ActivityStatus.Pending:
                return <ActivityIndicator size="small" color={statusColors?.accent} />;
            case ActivityStatus.Success:
                return <Check size={16} color={statusColors?.text} />;
            case ActivityStatus.Warning:
                return <AlertTriangle size={16} color={statusColors?.text} />;
            case ActivityStatus.Error:
                return <AlertCircle size={16} color={statusColors?.text} />;
            default:
                return null;
        }
    };

    if (!statusColors) {
        return (
            <Animated.View
                style={[
                    STYLES.container,
                    { paddingTop: insets.top, height: BAR_CONFIG.height + insets.top },
                    animatedStyle,
                ]}
                pointerEvents="none"
            />
        );
    }

    const { background, text, iconBackground, shadowColor } = statusColors;

    return (
        <Animated.View
            style={[
                STYLES.container,
                {
                    paddingTop: insets.top,
                    height: BAR_CONFIG.height + insets.top,
                },
                animatedStyle,
            ]}
            pointerEvents={isVisible ? 'box-none' : 'none'}
        >
            {isVisible && (
                <Surface
                    style={[
                        STYLES.surface,
                        {
                            backgroundColor: background,
                            shadowColor,
                        },
                    ]}
                    elevation={4}
                >
                    <View style={STYLES.content}>
                        <View style={[STYLES.iconBox, { backgroundColor: iconBackground }]}>{getStatusIcon()}</View>
                        <Text style={[STYLES.message, { color: text }]} numberOfLines={1} variant="titleMedium">
                            {displayMessage}
                        </Text>
                    </View>
                </Surface>
            )}
        </Animated.View>
    );
}

const STYLES = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        marginHorizontal: 0,
        paddingHorizontal: 0,
        zIndex: 9999,
        justifyContent: 'flex-end',
    },
    surface: {
        marginHorizontal: 0,
        paddingHorizontal: 0,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        height: BAR_CONFIG.height,
        padding: 12,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    message: {
        flex: 1,
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: -0.5,
    },
});
