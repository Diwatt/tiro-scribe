/**
 * Main application component.
 * When not in Storybook, the app runs via Expo Router (see index.js: expo-router/entry).
 * Root layout and startup flow live in app/_layout.tsx (StartupOrchestrator + Slot).
 * This component is only used when explicitly mounted; otherwise the entry is app/_layout.
 */

import type React from 'react';
import { AppLogger } from './Service/Logger';

let StorybookUIRoot: React.ComponentType | null = null;
if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.STORYBOOK_ENABLED === 'true') {
    try {
        StorybookUIRoot = require('../.rnstorybook').default;
    } catch (e) {
        AppLogger.getInstance().warn('[TiroScribe] Failed to load Storybook:', {
            error: e,
            errorMessage: e instanceof Error ? e.message : String(e),
        });
    }
}

/** Used when App is mounted (e.g. tests). Otherwise use expo-router entry → app/_layout.tsx. */
export function App(): React.JSX.Element {
    if (StorybookUIRoot) {
        return <StorybookUIRoot />;
    }
    const RootLayout = require('../app/_layout').default;
    return <RootLayout />;
}
