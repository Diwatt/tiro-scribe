import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APP_THEME } from '../src/theme/AppTheme';
import { PaperInk } from '../src/theme/PaperInk';

/**
 * Global decorators for all stories
 * Wraps stories with necessary providers (Theme, SafeArea) on the paper background, edge to edge
 * so full screens render as on device.
 */
export const decorators = [
    (Story: React.ComponentType) => (
        <SafeAreaProvider>
            <PaperProvider theme={APP_THEME}>
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
        backgroundColor: PaperInk.PAPER,
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
