/**
 * Gate screen – runs device check and onboarding check, then redirects.
 * Shown briefly at app start; redirects to /incompatible, /onboarding, or /main.
 */

import { useRouter } from 'expo-router';
import type React from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Database } from '@/Database/Database';
import { registry } from '@/Database/Registry';
import { Therapist } from '@/Entity/Therapist';
import { deviceCompatibilityGate } from '@/Security/DeviceCompatibilityGate';

type GateState = 'loading' | 'incompatible' | 'onboarding' | 'main';

export default function GateScreen(): React.JSX.Element | null {
    const theme = useTheme();
    const router = useRouter();
    const [gateState, setGateState] = useState<GateState>('loading');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Database.initialize();
            if (cancelled) {
                return;
            }
            const ok = deviceCompatibilityGate.isCompatible();
            if (!ok) {
                setGateState('incompatible');
                return;
            }
            const repo = await registry.getRepository(Therapist);
            const therapists = await repo.findAll();
            if (cancelled) {
                return;
            }
            setGateState(therapists.length > 0 ? 'main' : 'onboarding');
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (gateState === 'incompatible') {
            router.replace('/incompatible');
            return;
        }
        if (gateState === 'onboarding') {
            router.replace('/onboarding');
            return;
        }
        if (gateState === 'main') {
            router.replace('/main');
        }
    }, [gateState, router]);

    if (gateState !== 'loading') {
        return null;
    }

    return (
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
