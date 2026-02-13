import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppLanguage } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';

export function DeviceIncompatibleScreen(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useAppLanguage();
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>{LL.deviceNotSupported()}</Text>
            <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{LL.deviceNotSupportedMessage()}</Text>
            <Text style={[styles.hint, { color: theme.colors.outline }]}>{LL.deviceNotSupportedHint()}</Text>
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
