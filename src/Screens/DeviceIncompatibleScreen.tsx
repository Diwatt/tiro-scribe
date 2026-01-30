/**
 * Device Incompatible Screen
 * Shown when DeviceCheck.checkCompatible() returns false. Blocks all navigation.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export function DeviceIncompatibleScreen(): React.JSX.Element {
    const theme = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                Device not supported
            </Text>
            <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                Scribe requires a compatible device for on-device AI processing.
            </Text>
            <Text style={[styles.hint, { color: theme.colors.outline }]}>
                iOS: iPhone 12 or newer, 3.8GB+ RAM.{'\n'}
                Android: 6GB+ RAM, 64-bit CPU.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    hint: {
        fontSize: 14,
        textAlign: 'center',
    },
});
