/**
 * Onboarding route – Welcome fork first (Expo Router): start fresh opens the
 * wizard, restore navigates to /restore. The wizard lives in
 * src/Screen/Onboarding/Screen.tsx.
 */

import { router } from 'expo-router';
import type React from 'react';
import { useState } from 'react';
import { OnboardingScreen, WelcomeScreen } from '@/Screen';

export default function OnboardingRoute(): React.JSX.Element {
    const [hasStarted, setIsStarted] = useState(false);

    if (hasStarted) {
        return <OnboardingScreen />;
    }

    return <WelcomeScreen onStart={() => setIsStarted(true)} onRestore={() => router.push('/restore')} />;
}
