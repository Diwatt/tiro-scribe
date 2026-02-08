import { ActivityStatus } from '@/State/GlobalActivityStatus';
import type { ExtendedTheme } from '@/theme/AppTheme';
import type { StatusColors } from '@/Components/Status/Status';
import { AlertCircle, AlertTriangle, Check } from 'lucide-react-native';
import type React from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ActivityIndicator, Surface, Text, useTheme } from 'react-native-paper';

const BAR_HEIGHT = 48;
const SLIDE_HIDDEN_OFFSET = -150;
const ANIMATION_DURATION_MS = 280;

export interface GlobalActivityBarProps {
    status: ActivityStatus;
    message?: string;
}

/** Maps ActivityStatus to the same Status color keys used by Status component. */
function getStatusColors(theme: ExtendedTheme, status: ActivityStatus): StatusColors | null {
    const { colors } = theme;
    switch (status) {
        case ActivityStatus.Pending:
            return colors.statusProcessing;
        case ActivityStatus.Success:
            return colors.statusIdle;
        case ActivityStatus.Warning:
            return colors.statusWarning;
        case ActivityStatus.Error:
            return colors.statusError;
        default:
            return null;
    }
}

function getDefaultMessage(status: ActivityStatus): string {
    switch (status) {
        case ActivityStatus.Pending:
            return 'Chargement…';
        case ActivityStatus.Success:
            return 'Terminé';
        case ActivityStatus.Warning:
            return 'Attention';
        case ActivityStatus.Error:
            return 'Une erreur est survenue';
        default:
            return '';
    }
}

export function GlobalActivityBar(props: GlobalActivityBarProps): React.JSX.Element {
    const { status, message } = props;
    const theme = useTheme<ExtendedTheme>();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(SLIDE_HIDDEN_OFFSET);

    const isVisible = status !== ActivityStatus.Ready;

    useEffect(() => {
        translateY.value = withTiming(isVisible ? 0 : SLIDE_HIDDEN_OFFSET, {
            duration: ANIMATION_DURATION_MS,
        });
    }, [isVisible, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const statusColors = getStatusColors(theme, status);
    const displayMessage = message ?? getDefaultMessage(status);

    if (!statusColors) {
        return (
            <Animated.View
                style={[styles.container, { paddingTop: insets.top, height: BAR_HEIGHT + insets.top }, animatedStyle]}
                pointerEvents="none"
            />
        );
    }

    const { background, text, accent, iconBackground, shadowColor } = statusColors;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    height: BAR_HEIGHT + insets.top,
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
                            {status === ActivityStatus.Pending && (
                                <ActivityIndicator size="small" color={accent} />
                            )}
                            {status === ActivityStatus.Success && (
                                <Check size={16} color={text} />
                            )}
                            {status === ActivityStatus.Warning && (
                                <AlertTriangle size={16} color={text} />
                            )}
                            {status === ActivityStatus.Error && (
                                <AlertCircle size={16} color={text} />
                            )}
                        </View>
                        <Text
                            style={[styles.message, { color: text }]}
                            numberOfLines={1}
                            variant="titleMedium"
                        >
                            {displayMessage}
                        </Text>
                    </View>
                </Surface>
            )}
        </Animated.View>
    );
}

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
        height: BAR_HEIGHT,
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
