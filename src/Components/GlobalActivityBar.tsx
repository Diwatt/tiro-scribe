import { observer } from '@legendapp/state/react';
import { AlertCircle, AlertTriangle, Check } from 'lucide-react-native';
import type React from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Surface, Text, useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StatusColors } from '@/Components/Status/Status';
import { ActivityStatus, globalActivityStatus } from '@/State/GlobalActivityStatus';
import type { ExtendedTheme } from '@/theme/AppTheme';

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

// coherent mappings for colours and default messages. using record lookups
// means we avoid repetitive switch statements and the mappings stay in sync
// (lint will warn when a case is missing).
const COLOR_MAP: Partial<Record<ActivityStatus, (theme: ExtendedTheme) => StatusColors>> = {
    [ActivityStatus.Pending]: (theme) => theme.colors.statusProcessing,
    [ActivityStatus.Success]: (theme) => theme.colors.statusIdle,
    [ActivityStatus.Warning]: (theme) => theme.colors.statusWarning,
    [ActivityStatus.Error]: (theme) => theme.colors.statusError,
};

export function getStatusColors(theme: ExtendedTheme, status: ActivityStatus): StatusColors | null {
    const getter = COLOR_MAP[status];
    return getter ? getter(theme) : null;
}

// logic for reading highest-priority non-ready entry from the store
export function readFromStore(): { status: ActivityStatus; message: string; icon?: React.ReactNode } {
    const status = globalActivityStatus.getStatus();
    const message = globalActivityStatus.getMessage() ?? '';
    const icon = globalActivityStatus.getIcon();
    return { status, message, icon };
}

export function GlobalActivityBar(props: GlobalActivityBarProps): React.JSX.Element {
    const { status: propStatus, message: propMessage, icon: propIcon } = props;
    const { status: storeStatus, message: storeMessage, icon: storeIcon } = readFromStore();
    const status = propStatus ?? storeStatus;
    const message = propMessage ?? storeMessage;
    const icon = propIcon ?? storeIcon;

    // debug - log every render and the status/message being shown
    console.log('[GlobalActivityBar] render', { status, message });

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

    if (!statusColors) {
        return (
            <Animated.View style={[styles.container, { paddingTop: insets.top, height: BAR_CONFIG.height + insets.top }, animatedStyle]} pointerEvents="none" />
        );
    }

    const { background, text, accent, iconBackground, shadowColor } = statusColors;

    return (
        <Animated.View
            style={[
                styles.container,
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
                        styles.surface,
                        {
                            backgroundColor: background,
                            shadowColor,
                        },
                    ]}
                    elevation={4}
                >
                    <View style={styles.content}>
                        <View style={[styles.iconBox, { backgroundColor: iconBackground }]}>
                            {icon ? (
                                icon
                            ) : status === ActivityStatus.Pending ? (
                                <ActivityIndicator size="small" color={accent} />
                            ) : status === ActivityStatus.Success ? (
                                <Check size={16} color={text} />
                            ) : status === ActivityStatus.Warning ? (
                                <AlertTriangle size={16} color={text} />
                            ) : status === ActivityStatus.Error ? (
                                <AlertCircle size={16} color={text} />
                            ) : null}
                        </View>
                        <Text style={[styles.message, { color: text }]} numberOfLines={1} variant="titleMedium">
                            {displayMessage}
                        </Text>
                    </View>
                </Surface>
            )}
        </Animated.View>
    );
}

// observer version wraps the component so it re-renders when the store changes
export const ObservedGlobalActivityBar = observer(GlobalActivityBar);

const styles = StyleSheet.create({
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
