/**
 * Root layout – Startup flow (Hardware → Auth → Routing).
 * Observer: BOOTING → null (native splash); HARDWARE_REJECTED → DeviceIncompatibleScreen; ONBOARDING/READY → Slot.
 */

import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { Slot, useRouter } from 'expo-router';
import { observer } from '@legendapp/state/react';
import { AppErrorBoundary } from '@/Components/AppErrorBoundary';
import { AppTheme } from '@/theme/AppTheme';
import { ServicesProvider } from '@/Context/ServicesContext';
import { DeviceIncompatibleScreen } from '@/Screens/DeviceIncompatibleScreen';
import { StartupState, startupOrchestrator } from '@/State/StartupOrchestrator';

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
    startupOrchestrator.runSequence();
  }, []);

  const state = startupOrchestrator.observable.get();

  useEffect(() => {
    if (state === StartupState.BOOTING) return;
    hideSplash();
  }, [state]);

  useEffect(() => {
    if (state === StartupState.ONBOARDING) {
      router.replace('/onboarding');
      return;
    }
    if (state === StartupState.READY && !replacedForReady.current) {
      replacedForReady.current = true;
      router.replace('/main');
    }
  }, [state, router]);

  if (state === StartupState.BOOTING) {
    return null;
  }
  if (state === StartupState.HARDWARE_REJECTED) {
    return <DeviceIncompatibleScreen />;
  }
  return <Slot />;
}

const ObservedStartupGate = observer(StartupGateContent);

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <SafeAreaProvider>
          <PaperProvider theme={AppTheme}>
            <ServicesProvider services={services}>
              <ObservedStartupGate />
            </ServicesProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
