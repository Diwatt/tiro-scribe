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

export default function App() {
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
