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

// Only recording loads at app start. DB, transcript, Biocode, NER will be added later.

// Storybook UI (only loaded when STORYBOOK_ENABLED is true)
let StorybookUIRoot: React.ComponentType | null = null;
if (__DEV__ && process.env.STORYBOOK_ENABLED === 'true') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        StorybookUIRoot = require('../.rnstorybook').default;
    } catch (e) {
        console.warn('[TiroScribe] Failed to load Storybook:', e);
    }
}

export function App() {
    if (StorybookUIRoot) {
        return <StorybookUIRoot />;
    }
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
