/**
 * InitGate – Hardware Check → Onboarding (if no account) → Main app.
 * Renders DeviceIncompatibleScreen | OnboardingScreen | AppNavigator based on device check and therapist presence.
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { deviceCompatibilityGate } from '../Security/DeviceCompatibilityGate';
import { registry } from '../Database/Registry';
import { Therapist } from '../Entity/Therapist';
import { DeviceIncompatibleScreen } from '../Screens/DeviceIncompatibleScreen';
import { OnboardingScreen } from '../Screens/OnboardingScreen';
import { AppNavigator } from '../Navigation/AppNavigator';

type GateState = 'loading' | 'incompatible' | 'onboarding' | 'main';

export function InitGate(): React.JSX.Element {
    const theme = useTheme();
    const [gateState, setGateState] = useState<GateState>('loading');
    const [hasTherapist, setHasTherapist] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const ok = deviceCompatibilityGate.isCompatible();
        if (cancelled) return;
        if (!ok) {
            setGateState('incompatible');
            return;
        }
        const therapists = registry.getRepository(Therapist).findAll();
        const has = therapists.length > 0;
        setHasTherapist(has);
        setGateState(has ? 'main' : 'onboarding');
        return () => {
            cancelled = true;
        };
    }, []);

    const handleOnboardingComplete = () => {
        setHasTherapist(true);
        setGateState('main');
    };

    if (gateState === 'loading') {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }
    if (gateState === 'incompatible') {
        return <DeviceIncompatibleScreen />;
    }
    if (gateState === 'onboarding') {
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }
    return <AppNavigator />;
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
