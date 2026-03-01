import type React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import type { ExtendedTheme } from '@/theme/AppTheme';
import { StatusState } from './StatusTypes';

export interface StatusColors {
    background: string;
    text: string;
    accent: string;
    iconBackground: string;
    shadowColor: string;
}

export interface StatusBaseProps {
    title: string;
    subtitle?: string;
    icon: ReactNode;
    state: StatusState;
    iconBgOverride?: string;
    children?: ReactNode;
}

export function Status({ title, subtitle, icon, state, iconBgOverride, children }: StatusBaseProps): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const statusColorKey = StatusState.getColorKey(state);

    // Type-safe access to status colors
    const statusColors = (() => {
        switch (statusColorKey) {
            case 'statusIdle':
                return theme.colors.statusIdle;
            case 'statusProcessing':
                return theme.colors.statusProcessing;
            case 'statusBatchWaiting':
                return theme.colors.statusBatchWaiting;
            case 'statusSetup':
                return theme.colors.statusSetup;
            case 'statusError':
                return theme.colors.statusError;
            case 'statusWarning':
                return theme.colors.statusWarning;
            default:
                // Fallback to statusIdle if unknown
                return theme.colors.statusIdle;
        }
    })();

    return (
        <Surface
            style={[
                STYLES.container,
                {
                    backgroundColor: statusColors.background,
                    shadowColor: statusColors.shadowColor,
                },
            ]}
            elevation={4}
        >
            <View style={STYLES.contentWrapper}>
                <View style={STYLES.headerRow}>
                    <View style={[STYLES.iconBox, { backgroundColor: iconBgOverride ?? statusColors.iconBackground }]}>
                        {icon}
                    </View>
                    <View style={STYLES.headerText}>
                        <Text variant="titleMedium" style={[STYLES.title, { color: statusColors.text }]}>
                            {title}
                        </Text>
                        {Boolean(subtitle) && (
                            <Text variant="bodySmall" style={[STYLES.subtitle, { color: statusColors.text }]}>
                                {subtitle}
                            </Text>
                        )}
                    </View>
                </View>
                {children}
            </View>
        </Surface>
    );
}

const STYLES = StyleSheet.create({
    container: {
        borderRadius: 24,
        marginBottom: 20,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    contentWrapper: {
        padding: 20,
        overflow: 'hidden',
        borderRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerText: {
        flex: 1,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontWeight: '800',
        fontSize: 18,
        letterSpacing: -0.5,
    },
    subtitle: {
        opacity: 0.8,
        marginTop: 2,
    },
});
