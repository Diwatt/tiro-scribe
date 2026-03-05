/**
 * Gate screen – Single boot entry point.
 * Initializes DB, runs StartupOrchestrator, shows spinner, then redirects.
 * No other screen mounts until this gate completes.
 */

import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppConfig } from '@/Config';
import { Database } from '@/Database/Database';
import { StartupOrchestrator, StartupState } from '../src/State/StartupOrchestrator';

async function hideSplash(): Promise<void> {
    try {
        const SplashScreen = await import('expo-splash-screen');
        await SplashScreen.hideAsync();
    } catch {
        // expo-splash-screen optional
    }
}

export default observer(function GateScreen(): React.JSX.Element | null {
    const theme = useTheme();
    const router = useRouter();
    const bootStarted = useRef(false);
    const startupOrchestrator = useMemo(() => new StartupOrchestrator(), []);

    useEffect(() => {
        if (bootStarted.current) {
            return;
        }
        bootStarted.current = true;

        (async () => {
            // optionally clear DB on launch when explicitly enabled via env.
            // fallback to AppConfig.isDev only for safety; the flag gives developers control
            // without having to rebuild the binary.
            const appConfig = AppConfig.getInstance();
            if (appConfig.isDev && appConfig.shouldClearDbOnLaunch) {
                try {
                    await Database.reset();
                } catch (_error_) {
                    // Database reset failed, continue silently
                }
            }

            await Database.initialize();
            await startupOrchestrator.run();
        })();
    }, [startupOrchestrator.run]);

    const state = startupOrchestrator.stateObservable.get();

    useEffect(() => {
        if (state === StartupState.Booting) {
            return;
        }
        hideSplash();

        if (state === StartupState.HardwareRejected) {
            router.replace('/incompatible');
            return;
        }
        if (state === StartupState.Onboarding) {
            router.replace('/onboarding');
            return;
        }
        if (state === StartupState.Ready) {
            router.replace('/main');
        }
    }, [state, router]);

    return (
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
});

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
