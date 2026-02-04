import React, {ReactNode} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Surface, useTheme} from 'react-native-paper';
import {StatusState} from './StatusTypes';

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

export function Status({
    title,
    subtitle,
    icon,
    state,
    iconBgOverride,
    children,
}: StatusBaseProps): React.JSX.Element {
    const theme = useTheme();
    const statusColorKey = StatusState.getColorKey(state);
    const statusColors = (theme.colors as any)[statusColorKey] as StatusColors;
    return (
        <Surface
            style={[
                styles.container,
                {
                    backgroundColor: statusColors.background,
                    shadowColor: statusColors.shadowColor,
                },
            ]}
            elevation={4}>
            <View style={styles.contentWrapper}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconBox, {backgroundColor: iconBgOverride ?? statusColors.iconBackground}]}>
                        {icon}
                    </View>
                    <View style={styles.headerText}>
                        <Text
                            variant="titleMedium"
                            style={[styles.title, {color: statusColors.text}]}>
                            {title}
                        </Text>
                        {subtitle && (
                            <Text
                                variant="bodySmall"
                                style={[styles.subtitle, {color: statusColors.text}]}>
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

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        marginBottom: 20,
        shadowOffset: {width: 0, height: 8},
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
