/**
 * Main application component
 * 
 * Services are disabled - only recording functionality is enabled
 */

import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import {AppNavigator} from './Navigation/AppNavigator';
import {AppTheme} from './theme/AppTheme';
import {ServicesProvider} from './Context/ServicesContext';

// Storybook UI (only loaded when STORYBOOK_ENABLED is true)
let StorybookUIRoot: React.ComponentType | null = null;
if (__DEV__) {
    // Debug: Check if Storybook should be enabled
    const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true';
    if (storybookEnabled) {
        console.log('📚 Storybook mode enabled');
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            StorybookUIRoot = require('../.rnstorybook').default;
        } catch (e) {
            console.warn('⚠️ Failed to load Storybook:', e);
        }
    } else {
        console.log('📱 Normal app mode (STORYBOOK_ENABLED=' + process.env.STORYBOOK_ENABLED + ')');
    }
}

export function App() {
    // Load Storybook if enabled
    if (StorybookUIRoot) {
        return <StorybookUIRoot />;
    }

    // Services are disabled - set all to null
    const services = {
        biocodeService: null,
        anonymizerService: null,
        audioProcessingService: null,
    };

    return (
        <SafeAreaProvider>
            <PaperProvider theme={AppTheme}>
                <ServicesProvider services={services}>
                    <AppNavigator />
                </ServicesProvider>
            </PaperProvider>
        </SafeAreaProvider>
    );
}
