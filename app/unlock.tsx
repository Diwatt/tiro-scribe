/**
 * Unlock route – Auth-gated boot: the password decrypts the keyfile and opens
 * the database (Expo Router). Logic lives in src/State/Start/UnlockState.ts.
 */

import type React from 'react';
import { UnlockGateScreen } from '@/Screen';

export default function UnlockRoute(): React.JSX.Element {
    return <UnlockGateScreen />;
}
