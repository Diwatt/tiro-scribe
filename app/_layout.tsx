/**
 * Root layout – Startup flow (Hardware → Auth → Routing).
 * Observer: BOOTING → null (native splash); HARDWARE_REJECTED → DeviceIncompatibleScreen; ONBOARDING/READY → Slot.
 */

import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { observer } from '@legendapp/state/react';
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
import { DeviceIncompatibleScreen } from '@/Screens/DeviceIncompatibleScreen';
import { ActivityStatus, globalActivityStatus } from '@/State/GlobalActivityStatus';
import { StartupState, startupOrchestrator } from '@/State/StartupOrchestrator';
import { AppTheme } from '@/theme/AppTheme';

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

function StartupGateContent(): React.JSX.Element | null {
    const router = useRouter();
    const replacedForReady = useRef(false);

    useEffect(() => {
        startupOrchestrator.run();
    }, []);

    const state = startupOrchestrator.state$.get();

    useEffect(() => {
        if (state === StartupState.Booting) {
            return;
        }
        hideSplash();
    }, [state]);

    useEffect(() => {
        if (state === StartupState.Onboarding) {
            router.replace('/onboarding');
            return;
        }
        if (state === StartupState.Ready && !replacedForReady.current) {
            replacedForReady.current = true;
            router.replace('/main');
        }
    }, [state, router]);

    if (state === StartupState.Booting) {
        return null;
    }
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
    return (
        <GlobalActivityBar
            status={status}
            message={message || undefined}
        />
    );
}

const ObservedGlobalActivityBar = observer(GlobalActivityBarSlot);

export default function RootLayout(): React.JSX.Element {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppErrorBoundary>
                <SafeAreaProvider>
                    <PaperProvider theme={AppTheme}>
                        <ServicesProvider services={services}>
                            <View style={{ flex: 1 }}>
                                <ObservedStartupGate />
                                <ObservedGlobalActivityBar />
                            </View>
                            <AppToast />
                        </ServicesProvider>
                    </PaperProvider>
                </SafeAreaProvider>
            </AppErrorBoundary>
        </GestureHandlerRootView>
    );
}
