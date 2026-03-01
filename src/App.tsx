/**
 * Main application component.
 * When not in Storybook, the app runs via Expo Router (see index.js: expo-router/entry).
 * Root layout (providers) lives in app/_layout.tsx; boot sequence in app/index.tsx (GateScreen).
 * This component is only used when explicitly mounted; otherwise the entry is app/_layout.
 */

import type React from 'react';
import { AppConfig } from '@/Config';
import { appLogger } from './Service/Logger';

let storybookUiRoot: React.ComponentType | null = null;
(async () => {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && AppConfig.isStorybookEnabled) {
        try {
            storybookUiRoot = (await import('../.rnstorybook')).default;
        } catch (e) {
            appLogger.warn('[TiroScribe] Failed to load Storybook:', {
                error: e,
                errorMessage: e instanceof Error ? e.message : String(e),
            });
        }
    }
})();

/** Used when App is mounted (e.g. tests). Otherwise use expo-router entry → app/_layout.tsx. */
export async function App(): Promise<React.JSX.Element> {
    if (storybookUiRoot) {
        return <storybookUiRoot />;
    }

    const { default: rootLayout } = await import('../app/_layout');
    return <rootLayout />;
}
