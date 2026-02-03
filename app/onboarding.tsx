/**
 * Onboarding route – wizard; on complete navigates to /main.
 */

import React from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/Screens/OnboardingScreen';

export default function OnboardingRoute(): React.JSX.Element {
  const router = useRouter();

  const handleComplete = () => {
    router.replace('/main');
  };

  return <OnboardingScreen onComplete={handleComplete} />;
}
