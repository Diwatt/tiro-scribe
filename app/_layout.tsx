/**
 * Root layout – Providers only. Always renders <Slot />.
 * Boot sequence lives in app/index.tsx (GateScreen) via StartupOrchestrator.
 */

import 'react-native-get-random-values';
import { install as installQuickCrypto } from 'react-native-quick-crypto';

installQuickCrypto();

import 'react-native-gesture-handler';
import { observer } from '@legendapp/state/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import type React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from '@/Components/AppErrorBoundary';
import { AppToast } from '@/Components/AppToast';
import { GlobalActivityBar } from '@/Components/GlobalActivityBar';
import { ServicesProvider } from '@/Context/ServicesContext';
import { initAppLocale } from '@/Localization';
import { ActivityStatus, globalActivityStatus } from '@/State/GlobalActivityStatus';
import { AppTheme } from '@/theme/AppTheme';

const queryClient = new QueryClient();

const services = {
    biocodeService: null,
    anonymizerService: null,
    audioProcessingService: null,
};

function GlobalActivityBarSlot(): React.JSX.Element {
    const key = globalActivityStatus.recoveryKitStatusKey;
    const status = globalActivityStatus.state$[key].get() ?? ActivityStatus.Ready;
    const message = globalActivityStatus.message$[key].get();
    return <GlobalActivityBar status={status} message={message || undefined} />;
}

const ObservedGlobalActivityBar = observer(GlobalActivityBarSlot);

export default function RootLayout(): React.JSX.Element {
    useEffect(() => {
        initAppLocale();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppErrorBoundary>
                <SafeAreaProvider>
                    <QueryClientProvider client={queryClient}>
                        <PaperProvider theme={AppTheme}>
                            <ServicesProvider services={services}>
                                <View style={{ flex: 1 }}>
                                    <Slot />
                                    <ObservedGlobalActivityBar />
                                </View>
                                <AppToast />
                            </ServicesProvider>
                        </PaperProvider>
                    </QueryClientProvider>
                </SafeAreaProvider>
            </AppErrorBoundary>
        </GestureHandlerRootView>
    );
}
