/// <reference types="jest" />
/**
 * jest.setup.ts - Jest setup for tiro-scribe
 *
 * This file is significantly simplified because jest-expo@54 provides comprehensive
 * built-in mocks for:
 * - 67+ Expo native modules (ExpoDevice, ExponentConstants, ExponentFileSystem, etc.)
 * - React Native core modules (Platform, Alert, AppState, Vibration, Keyboard, etc.)
 * - React Navigation (@react-navigation/native, native-stack, bottom-tabs)
 * - react-native-reanimated, react-native-gesture-handler, react-native-svg
 * - 100+ other third-party libraries
 *
 * We only mock here what jest-expo doesn't already provide or what requires custom handling.
 * See: node_modules/jest-expo/src/preset/setup.js for jest-expo's built-in mocks
 */

// Mock expo-modules-core before any modules that depend on it are imported.
// This prevents the "The global process.env.EXPO_OS is not defined" warning
// from expo-modules-core/src/Platform.ts during test initialization.
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn((name: string) => ({})),
  NativeModulesProxy: {},
  EventEmitter: jest.fn(),
}));

import { TextEncoder, TextDecoder } from "util";

// ============================================================================
// REQUIRED GLOBALS (must be first)
// ============================================================================

// Define __DEV__ global variable (required by app code)
(global as any).__DEV__ = true;

// Define EXPO_OS global variable (required by app code)
(global as any).EXPO_OS = process.env.EXPO_OS || 'ios';

// Polyfill for TextEncoder/TextDecoder (Node environment)
Object.assign(global, { TextEncoder, TextDecoder });

// ============================================================================
// EXPO/REACT NATIVE MODULES WITH SPECIAL BRIDGE HANDLING
// ============================================================================

/**
 * expo/fetch - Custom mock needed because expo/src/winter/fetch/FetchResponse.ts
 * extends the global Response class, which Babel's _inherits() helper can't handle
 * in a plain Node test environment ("Super expression must either be null or a function").
 *
 * This must be mocked before any source file that imports it (e.g. FileDownloader.ts).
 */
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: jest.fn(() => null), has: jest.fn(() => false) },
      json: jest.fn(() => Promise.resolve({})),
      text: jest.fn(() => Promise.resolve('')),
      arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
      blob: jest.fn(() => Promise.resolve(new Blob())),
      body: null,
      bodyUsed: false,
      clone: jest.fn(function() { return this; }),
    })
  ),
}));

/**
 * React Native Nitro Modules - Mock to prevent bridge config errors.
 * This is not a standard Expo/React Native module, so jest-expo doesn't handle it.
 */
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    install: jest.fn(),
  },
}));

/**
 * React Native Quick Crypto - Custom mock needed because it requires native modules.
 * Falls back to Node.js crypto module for testing.
 * jest-expo doesn't provide this.
 */
jest.mock('react-native-quick-crypto', () => {
  const crypto = require('crypto');
  return {
    __esModule: true,
    default: crypto,
    ...crypto,
    Buffer: global.Buffer,
  };
});

// ============================================================================
// EXPO MODULES - DIRECT IMPORTS (not just native bridge)
// ============================================================================
// These modules are imported directly in the app code, so they need jest.mock() mocks
// in addition to jest-expo's native module mocking at the bridge level.

/**
 * expo-audio - Direct module import for recording functionality.
 * Code imports: import { requestRecordingPermissionsAsync } from 'expo-audio';
 */
jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  Audio: {
    Sound: {
      createAsync: jest.fn(),
    },
  },
}));

/**
 * expo-sqlite - Delegated mock
 *
 * Heavy mock logic has been extracted to tests/jest/mocks/expo/expo-sqlite.mock.ts.
 * The jest.mock factory must be self-contained to avoid referencing out-of-scope variables.
 * We require the modular mock inside the factory so Jest accepts the mock.
 */
jest.mock('expo-sqlite', () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./tests/jest/mocks/expo/expo-sqlite.mock');
    return mod && mod.expoSqliteMock ? mod.expoSqliteMock : {
      openDatabaseSync: jest.fn(() => ({})),
      openDatabaseAsync: jest.fn(async () => ({})),
      deleteDatabaseAsync: jest.fn(async () => {}),
    };
  } catch (e) {
    // Minimal fallback to avoid throwing if the modular mock can't be resolved.
    return {
      openDatabaseSync: jest.fn(() => ({})),
      openDatabaseAsync: jest.fn(async () => ({})),
      deleteDatabaseAsync: jest.fn(async () => {}),
    };
  }
});

/**
 * expo-device - Delegated mock
 *
 * Device information defaults have been moved to tests/jest/mocks/expo/expo-device.mock.ts.
 * The jest.mock factory uses require internally so it remains self-contained.
 */
jest.mock('expo-device', () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./tests/jest/mocks/expo/expo-device.mock');
    return mod && mod.expoDeviceMock ? mod.expoDeviceMock : { osName: 'iOS' };
  } catch (e) {
    // Minimal fallback
    return { osName: 'iOS' };
  }
});

/**
 * expo-file-system - Delegated mock
 *
 * File system helpers moved to tests/jest/mocks/expo/expo-file-system.mock.ts.
 * The jest.mock factory uses require internally so it remains self-contained.
 */
jest.mock('expo-file-system', () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./tests/jest/mocks/expo/expo-file-system.mock');
    return mod && mod.expoFileSystemMock ? mod.expoFileSystemMock : {
      documentDirectory: '/documents/',
      cacheDirectory: '/cache/',
    };
  } catch (e) {
    return {
      documentDirectory: '/documents/',
      cacheDirectory: '/cache/',
    };
  }
});

/**
 * expo-constants - Direct module import for app configuration.
 * Code imports: import Constants from 'expo-constants';
 */
jest.mock('expo-constants', () => ({
  default: {
    expoVersion: '54.0.0',
    manifest: { extra: {} },
    sessionId: 'test-session',
  },
}));

/**
 * expo-crypto - Direct module import for cryptographic operations.
 * Code imports: import * as Crypto from 'expo-crypto';
 */
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => Buffer.alloc(32)),
  digestStringAsync: jest.fn(async () => 'hash'),
  getRandomValues: jest.fn((buffer) => { buffer.fill(42); return buffer; }),
}));

/**
 * expo-secure-store - Direct module import for secure storage.
 * Code imports: import * as SecureStore from 'expo-secure-store';
 */
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

/**
 * expo-localization - Direct module import for localization.
 * Code imports: import { getLocales, locale } from 'expo-localization';
 */
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
  locale: 'en',
}));

/**
 * expo-linking - Direct module import for deep linking.
 * Code imports: import * as Linking from 'expo-linking';
 */
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `exp://example.com${path}`),
  getInitialURL: jest.fn(() => null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

/**
 * expo-clipboard - Direct module import for clipboard operations.
 * Code imports: import * as Clipboard from 'expo-clipboard';
 */
jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(async () => ''),
  setStringAsync: jest.fn(async () => {}),
}));

/**
 * expo-sharing - Direct module import for sharing functionality.
 * Code imports: import * as Sharing from 'expo-sharing';
 */
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(async () => {}),
}));

/**
 * expo-print - Direct module import for printing functionality.
 * Code imports: import * as Print from 'expo-print';
 */
jest.mock('expo-print', () => ({
  printAsync: jest.fn(async () => {}),
  printToFileAsync: jest.fn(async () => ({ uri: '/temp/file.pdf' })),
}));

// ============================================================================
// EXPO ROUTER MOCK
// ============================================================================

/**
 * expo-router is a framework module, not a native module, so jest-expo doesn't mock it.
 * This is critical for routing and navigation tests.
 */
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
    })),
    useLocalSearchParams: jest.fn(() => ({})),
    usePathname: jest.fn(() => '/'),
    useGlobalSearchParams: jest.fn(() => ({})),
    Stack: {
      Navigator: ({ children }: any) => children,
      Screen: () => null,
    },
    Tabs: {
      Navigator: ({ children }: any) => children,
      Screen: () => null,
    },
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
    },
    createNavigatorFactory: jest.fn(() => jest.fn()),
    Link: ({ children }: any) => children,
    Href: jest.fn(),
  };
});

// ============================================================================
// UI & COMPONENT LIBRARIES
// ============================================================================

/**
 * react-native-paper - Material Design component library.
 * jest-expo doesn't provide this since it's a third-party UI library.
 */
jest.mock('react-native-paper', () => ({
  Button: ({ children, onPress }: any) =>
    jest.fn(() => children)(),
  Text: ({ children }: any) => children,
  ActivityIndicator: () => null,
  Modal: ({ children, visible }: any) => (visible ? children : null),
  Provider: ({ children }: any) => children,
  MD3LightTheme: {},
  MD3DarkTheme: {
    colors: {
      primary: '#000',
      onPrimary: '#fff',
      primaryContainer: '#000',
      onPrimaryContainer: '#fff',
      secondary: '#000',
      onSecondary: '#fff',
      secondaryContainer: '#000',
      onSecondaryContainer: '#fff',
      tertiary: '#000',
      onTertiary: '#fff',
      tertiaryContainer: '#000',
      onTertiaryContainer: '#fff',
      error: '#000',
      onError: '#fff',
      errorContainer: '#000',
      onErrorContainer: '#fff',
      background: '#000',
      onBackground: '#fff',
      surface: '#000',
      onSurface: '#fff',
      surfaceVariant: '#000',
      onSurfaceVariant: '#fff',
      outline: '#000',
      outlineVariant: '#000',
      shadow: '#000',
      scrim: '#000',
      inverseSurface: '#000',
      inverseOnSurface: '#fff',
      inversePrimary: '#000',
      elevation: {
        level0: 'transparent',
        level1: '#000',
        level2: '#000',
        level3: '#000',
        level4: '#000',
        level5: '#000',
      },
      surfaceDisabled: '#000',
      onSurfaceDisabled: '#fff',
      backdrop: '#000',
    },
  },
  useTheme: jest.fn(() => ({})),
}));

/**
 * lucide-react-native - Icon library.
 * jest-expo doesn't provide this since it's a third-party library.
 */
jest.mock('lucide-react-native', () => ({
  AlertCircle: () => null,
  ArrowBack: () => null,
  CheckCircle: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
  Clock: () => null,
  Copy: () => null,
  Download: () => null,
  Edit: () => null,
  Eye: () => null,
  EyeOff: () => null,
  Heart: () => null,
  Home: () => null,
  LogOut: () => null,
  Menu: () => null,
  Mic: () => null,
  MicOff: () => null,
  Minus: () => null,
  More: () => null,
  MoreHorizontal: () => null,
  Pause: () => null,
  Play: () => null,
  Plus: () => null,
  Search: () => null,
  Settings: () => null,
  Share: () => null,
  Trash: () => null,
  User: () => null,
  X: () => null,
}));

// ============================================================================
// STORAGE & LOCAL UTILITIES
// ============================================================================

/**
 * @react-native-async-storage/async-storage - Local storage mock.
 * jest-expo doesn't provide this.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

/**
 * react-native-toast-message - Toast notifications UI component.
 * jest-expo doesn't provide this.
 */
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
  hideAll: jest.fn(),
}));

// ============================================================================
// LOGGING & INSTRUMENTATION
// ============================================================================

/**
 * react-native-logs - Custom logger for the app.
 * jest-expo doesn't provide this.
 */
jest.mock('react-native-logs', () => {
  const mockLoggerInstance = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(() => mockLoggerInstance),
    enable: jest.fn(() => true),
    disable: jest.fn(() => true),
    getExtensions: jest.fn(() => []),
    setSeverity: jest.fn((s) => s),
    getSeverity: jest.fn(() => 'debug'),
    patchConsole: jest.fn(),
  };
  return {
    useLogger: jest.fn(() => mockLoggerInstance),
    consoleTransport: jest.fn(),
    logger: {
      createLogger: jest.fn(() => mockLoggerInstance),
    },
  };
});

// ============================================================================
// HTTP MOCKING
// ============================================================================

/**
 * msw (Mock Service Worker)
 *
 * NOTE: msw (and msw/node) should not be mocked in the global test setup.
 * Leave the real library unmocked so individual tests can import and configure
 * it as needed (e.g. `import { rest } from 'msw'` and `import { setupServer } from 'msw/node'`).
 *
 * Tests that require HTTP mocking should set up `setupServer` within their
 * own test files or test-specific setup modules.
 */

// ============================================================================
// GLOBAL FETCH POLYFILL (FALLBACK)
// ============================================================================

/**
 * Jest-expo provides a fetch polyfill, but we ensure it's available as a fallback.
 * This shouldn't be needed if jest-expo is set up correctly, but it's here for safety.
 */
if (typeof (global as any).fetch === 'undefined') {
  (global as any).fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: jest.fn(() => Promise.resolve({})),
      text: jest.fn(() => Promise.resolve('')),
      arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
      blob: jest.fn(() => Promise.resolve(new Blob())),
      clone: jest.fn(function() { return this; }),
    })
  );
}

export {};
