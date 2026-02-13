/**
 * Onboarding route – Renders OnboardingScreen (Expo Router).
 * Flow and logic live in src/Screen/Onboarding/Screen.tsx.
 * On complete, the screen calls startupOrchestrator.run(); _layout observes state and redirects to /main.
 */

import type React from 'react';
import { OnboardingScreen } from '@/Screen';

export default function OnboardingRoute(): React.JSX.Element {
    return <OnboardingScreen />;
}
