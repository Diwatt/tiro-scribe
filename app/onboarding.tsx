/**
 * Onboarding route – Renders OnboardingScreen (Expo Router).
 * Flow and logic live in src/Screens/OnboardingScreen.tsx.
 * On complete, the screen calls startupOrchestrator.run(); _layout observes state and redirects to /main.
 */

import type React from 'react';
import { OnboardingScreen } from '@/Screens';

export default function OnboardingRoute(): React.JSX.Element {
    return <OnboardingScreen />;
}
