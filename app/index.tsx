/**
 * Gate screen – Single boot entry point.
 * Initializes DB, runs StartupOrchestrator, shows spinner, then redirects.
 * No other screen mounts until this gate completes.
 */

import { observer } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { AppConfig } from '@/Core/AppConfig';
import { Container } from '@/Core/Container';
import { CryptoEngine } from '@/Security';
import { Database } from '@/Database/Database';
import { DatabaseKeyfile } from '@/Security';
import { ENTITY_CLASSES } from '@/Entity';
import { DeviceCompatibilityGate } from '@/Security/DeviceCompatibilityGate';
import { LaunchScreen } from '@/Screen/Start/LaunchScreen';
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
    const router = useRouter();
    const bootStarted = useRef(false);
    const startupOrchestrator = useMemo(() => Container.get(StartupOrchestrator), []);

    useEffect(() => {
        if (bootStarted.current) {
            return;
        }
        bootStarted.current = true;

        (async () => {
            // optionally clear DB on launch when explicitly enabled via env.
            // fallback to AppConfig.isDev only for safety; the flag gives developers control
            // without having to rebuild the binary.
            const appConfig = Container.get(AppConfig);
            if (appConfig.isDev && appConfig.shouldClearDbOnLaunch) {
                try {
                    await Database.reset();
                } catch (_error_) {
                    // Database reset failed, continue silently
                }
            }

            if (!Container.get(DeviceCompatibilityGate).isCompatible()) {
                router.replace('/incompatible');
                await hideSplash();
                return;
            }

            // Auth-gated boot (cf. docs/AUTH_GATED_BOOT.md): no database access before
            // user auth. Keyfile present -> unlock screen decrypts the dbKey first.
            const keyfile = Container.get(DatabaseKeyfile);
            if (await keyfile.exists()) {
                router.replace('/unlock');
                await hideSplash();
                return;
            }

            // First install: bootstrap a RAM-held dbKey; the keyfile is written at
            // onboarding finalize (password + recovery code known by then).
            const dbKey = Container.get(CryptoEngine).randomKey(32);
            await Database.initialize({ entities: ENTITY_CLASSES, dbKey });
            await startupOrchestrator.run();
        })();
    }, [router, startupOrchestrator.run]);

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

    return <LaunchScreen />;
});
