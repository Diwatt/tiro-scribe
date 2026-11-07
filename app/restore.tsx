/**
 * Restore route – Vault recovery with a recovery kit (Expo Router).
 * Flow and logic live in src/Screen/Start/RestoreScreen.tsx and
 * src/State/Start/RestoreState.ts.
 */

import { router } from 'expo-router';
import type React from 'react';
import { RestoreScreen } from '@/Screen';

export default function RestoreRoute(): React.JSX.Element {
    return <RestoreScreen onBack={() => router.back()} />;
}
