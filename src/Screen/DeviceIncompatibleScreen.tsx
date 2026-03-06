import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useLocalization } from '@/Localization';
import type { ExtendedTheme } from '@/theme/AppTheme';

export function DeviceIncompatibleScreen(): React.JSX.Element {
    const theme = useTheme<ExtendedTheme>();
    const { LL } = useLocalization();
    return (
        <View style={[STYLES.container, { backgroundColor: theme.colors.background }]}>
            <Text style={[STYLES.title, { color: theme.colors.onBackground }]}>{LL.device.notSupported()}</Text>
            <Text style={[STYLES.message, { color: theme.colors.onSurfaceVariant }]}>
                {LL.device.notSupportedMessage()}
            </Text>
            <Text style={[STYLES.hint, { color: theme.colors.outline }]}>{LL.device.notSupportedHint()}</Text>
        </View>
    );
}

const STYLES = StyleSheet.create({
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
