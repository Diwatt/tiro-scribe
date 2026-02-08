/**
 * @format
 * Entry point for React Native application.
 *
 * JS errors: uncaughtException and unhandledRejection are logged with [TiroScribe].
 * AppErrorBoundary catches React render errors. Native crashes: run from Xcode (iOS)
 * or adb logcat (Android).
 */

import 'react-native-get-random-values';
import React from 'react';
import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const LOG = '[TiroScribe]';

function setupCrashLogging() {
    const ErrorUtils = typeof global !== 'undefined' ? global.ErrorUtils : undefined;
    if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
        const prev = ErrorUtils.getGlobalHandler?.();
        ErrorUtils.setGlobalHandler((error, isFatal) => {
            console.error(`${LOG} Uncaught JS error${isFatal ? ' (fatal)' : ''}:`, error?.message, error?.stack);
            if (typeof prev === 'function') prev(error, isFatal);
            else throw error;
        });
    }

    try {
        if (typeof global !== 'undefined') {
            const prev = global.onunhandledrejection;
            global.onunhandledrejection = (e) => {
                console.error(`${LOG} Unhandled promise rejection:`, e?.reason);
                if (typeof prev === 'function') prev(e);
            };
        }
    } catch (_) {}
}

setupCrashLogging();

// Storybook: when enabled, register Storybook UI; otherwise use Expo Router
let StorybookUIRoot = null;
if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.STORYBOOK_ENABLED === 'true') {
    try {
        StorybookUIRoot = require('./.rnstorybook').default;
    } catch (e) {
        console.warn('[TiroScribe] Failed to load Storybook:', e?.message ?? e);
    }
}

if (StorybookUIRoot) {
    const { AppErrorBoundary } = require('./src/Components/AppErrorBoundary');
    function Root() {
        return React.createElement(
            GestureHandlerRootView,
            { style: { flex: 1 } },
            React.createElement(AppErrorBoundary, null, React.createElement(StorybookUIRoot, null)),
        );
    }
    AppRegistry.registerComponent('main', () => Root);
} else {
    require('expo-router/entry');
}
