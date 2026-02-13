/**
 * Root layout – Startup flow (Hardware → Auth → Routing).
 * Observer: BOOTING → null (native splash); HARDWARE_REJECTED → DeviceIncompatibleScreen; ONBOARDING/READY → Slot.
 */

import 'react-native-get-random-values';
import { install as installQuickCrypto } from 'react-native-quick-crypto';

installQuickCrypto();

import 'react-native-gesture-handler';
import { observer } from '@legendapp/state/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter } from 'expo-router';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from '@/Components/AppErrorBoundary';
import { AppToast } from '@/Components/AppToast';
import { GlobalActivityBar } from '@/Components/GlobalActivityBar';
import { ServicesProvider } from '@/Context/ServicesContext';
import { Database } from '@/Database/Database';
import { initAppLocale } from '@/Localization';
import { DeviceIncompatibleScreen } from '@/Screen/DeviceIncompatibleScreen';
import { ActivityStatus, globalActivityStatus } from '@/State/GlobalActivityStatus';
import { StartupState, startupOrchestrator } from '@/State/StartupOrchestrator';
import { AppTheme } from '@/theme/AppTheme';

const queryClient = new QueryClient();

const services = {
    biocodeService: null,
    anonymizerService: null,
    audioProcessingService: null,
};

async function hideSplash(): Promise<void> {
    try {
        const SplashScreen = await import('expo-splash-screen');
        await SplashScreen.hideAsync();
    } catch {
        // expo-splash-screen optional
    }
}

function StartupGateContent(): React.JSX.Element {
    const router = useRouter();
    const replacedForReady = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Database.initialize();
            if (!cancelled) {
                await startupOrchestrator.run();
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const state = startupOrchestrator.state$.get();

    useEffect(() => {
        if (state === StartupState.Booting) {
            return;
        }
        hideSplash();
    }, [state]);

    useEffect(() => {
        if (state === StartupState.Booting) {
            return;
        }
        const schedule = (): void => {
            if (state === StartupState.Onboarding) {
                router.replace('/onboarding');
                return;
            }
            if (state === StartupState.Ready && !replacedForReady.current) {
                replacedForReady.current = true;
                router.replace('/main');
            }
        };
        const id = setTimeout(schedule, 0);
        return () => clearTimeout(id);
    }, [state, router]);

    if (state === StartupState.HardwareRejected) {
        return <DeviceIncompatibleScreen />;
    }
    return <Slot />;
}

const ObservedStartupGate = observer(StartupGateContent);

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
                                    <ObservedStartupGate />
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
