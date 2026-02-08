import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppTheme } from '../src/theme/AppTheme';

/**
 * Global decorators for all stories
 * Wraps stories with necessary providers (Theme, SafeArea, etc.)
 */
export const decorators = [
    (Story: React.ComponentType) => (
        <SafeAreaProvider>
            <PaperProvider theme={AppTheme}>
                <View style={styles.container}>
                    <Story />
                </View>
            </PaperProvider>
        </SafeAreaProvider>
    ),
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F8FAFC',
    },
});

export const parameters = {
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
};
