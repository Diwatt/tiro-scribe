/**
 * Main application component
 * 
 * Services are disabled - only recording functionality is enabled
 */

import React, {useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import {AppNavigator} from './Navigation/AppNavigator';
import {AppTheme} from './theme/AppTheme';
import {ServicesProvider} from './Context/ServicesContext';
import {ensureDatabaseInitialized} from '@Service/Database';

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
    const [dbReady, setDbReady] = useState(false);

    // Initialize database on mount
    useEffect(() => {
        ensureDatabaseInitialized()
            .then(() => setDbReady(true))
            .catch(error => {
                console.error('Failed to initialize database:', error);
                setDbReady(true); // Continue anyway to show error UI
            });
    }, []);

    // Load Storybook if enabled
    if (StorybookUIRoot) {
        return <StorybookUIRoot />;
    }

    // Wait for database initialization
    if (!dbReady) {
        return null; // Or a loading screen
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
