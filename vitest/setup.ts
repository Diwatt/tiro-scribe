/// <reference types="vitest/globals" />
import { vi } from 'vitest';

// Polyfill Symbol.metadata for Stage 3 decorators in test environment
if (!Symbol.metadata) {
    // Type-safe polyfill for Symbol.metadata
    const symbolMetadata = Symbol.for('Symbol.metadata');
    Object.defineProperty(Symbol, 'metadata', {
        value: symbolMetadata,
        writable: false,
        enumerable: false,
        configurable: false,
    });
}

// make React available globally so compiled JSX doesn't crash when tests
// don't explicitly import it
const React = require('react');
globalThis.React = React;

// Define __DEV__ global for React Native compatibility in tests
// Make it writable so test files can override it if needed
if (!('__DEV__' in globalThis)) {
    Object.defineProperty(globalThis, '__DEV__', {
        value: true,
        writable: true,
        enumerable: false,
        configurable: true,
    });
}

// Some expo modules rely on EXPO_OS, which is normally injected by the
// runtime.  Default to ios so Platform.OS is never undefined during tests.
process.env.EXPO_OS ||= 'ios';

// Mock expo/fetch directly to ensure it's available
vi.mock('expo/fetch', () => ({
    fetch: vi.fn(() =>
        Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        })
    ),
}));

// Mock react-native-quick-crypto (native module fails to parse in Vitest/Rollup)
vi.mock('react-native-quick-crypto', () => {
    const NodeBuffer = typeof Buffer !== 'undefined' ? Buffer : Uint8Array;
    const alloc = (size: number) => {
        if (typeof Buffer !== 'undefined' && NodeBuffer === Buffer) {
            return Buffer.alloc(size);
        }
        return new Uint8Array(size);
    };
    return {
        default: {
            createHash: () => ({
                update: () => ({
                    digest: () => ({ toString: () => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }),
                }),
            }),
            createCipheriv: () => ({
                update: () => alloc(0),
                final: () => alloc(0),
            }),
            createDecipheriv: () => ({
                update: () => alloc(0),
                final: () => alloc(0),
            }),
            pbkdf2Sync: (password: string, salt: string) => {
                // Deterministic mock: different (password,salt) => different hex so tests like "different salt => different key" pass
                const str = `${password}:${salt}`;
                let h = 0;
                for (let i = 0; i < str.length; i++) {
                    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
                }
                const hex = Math.abs(h).toString(16).padStart(64, '0').slice(0, 64);
                return Object.assign(alloc(32), {
                    toString: (enc: string) => (enc === 'hex' ? hex : ''),
                });
            },
        },
        Buffer: NodeBuffer,
    };
});

// Import shared mocks
import { mockExpoCrypto, mockExpoSecureStore, mockExpoFetch } from './mocks/expo-platform';
import { testKysely } from './mocks/kysely';

// Mock expo-crypto for Security tests (getRandomBytes, getRandomValues)
vi.mock('expo-crypto', () => mockExpoCrypto);

// Mock expo-file-system early to prevent expo-modules-core errors
vi.mock('expo-file-system', () => ({
    documentDirectory: '/tmp/',
}));

// Mock expo-sqlite to avoid requireNativeModule errors
vi.mock('expo-sqlite', () => ({
    openDatabaseAsync: vi.fn(() =>
        Promise.resolve({
            transaction: vi.fn((callback) =>
                callback({
                    executeSql: vi.fn(() => Promise.resolve([{ rows: { _array: [] }, insertId: 0, rowsAffected: 0 }])),
                }),
            ),
            closeAsync: vi.fn(() => Promise.resolve()),
            executeSql: vi.fn(() => Promise.resolve([{ rows: { _array: [] }, insertId: 0, rowsAffected: 0 }])),
        }),
    ),
    deleteDatabaseAsync: vi.fn(() => Promise.resolve()),
    useSQLiteContext: vi.fn(() => ({
        execAsync: vi.fn(() => Promise.resolve()),
        runAsync: vi.fn(() => Promise.resolve({ lastInsertRowId: 0, changes: 0 })),
        getAllAsync: vi.fn(() => Promise.resolve([])),
        getFirstAsync: vi.fn(() => Promise.resolve(null)),
    })),
}));

// Mock Legend-State: simplified version
vi.mock('@legendapp/state', () => {
    // primitive values were not being updated because `state` was a const and
    // the mock only mutated objects.  tests relying on writable observables
    // (like GlobalActivityStatus) failed when assigning strings.  use a
    // mutable `let` and always update the internal value for non-object types.
    const observable = (initial: unknown) => {
        let state: any =
            typeof initial === 'object' && initial !== null ? { ...(initial as object) } : initial;
        return {
            get: () => state,
            set: (value: unknown) => {
                if (typeof value === 'object' && value !== null && typeof state === 'object' && state !== null) {
                    Object.assign(state, value);
                } else {
                    // primitives or cases where previous state wasn't object just replace
                    state = value;
                }
            },
        };
    };
    return { observable };
});

vi.mock('@legendapp/state/persist', () => ({
    persistObservable: vi.fn(),
    configureObservablePersistence: vi.fn(),
}));

// Mock kysely-expo (native driver not available in Node tests)
vi.mock('kysely-expo', () => ({
    ExpoDialect: vi.fn(),
}));

// Replace @/Database/Kysely with a real Kysely instance backed by in-memory SQLite.
// Kysely itself is NOT mocked — real sql, real query builder, real SQL compilation.
vi.mock('@/Database/Kysely', () => ({
    qb: testKysely,
}));

// Note: expo/fetch is handled via alias in vitest.config.ts
// If alias doesn't work, uncomment below:
// vi.mock('expo/fetch', () => ({
//   fetch: mockExpoFetch.fetch,
// }));

// Expo modules core expects an ExpoGlobal object on the global scope with a
// barebones EventEmitter present.  Provide a tiny shim so imports don't
// crash during tests.  Some packages also reference globalThis.expo.
if (!globalThis.ExpoGlobal) {
    globalThis.ExpoGlobal = {
        EventEmitter: class {
            addListener() {
                return { remove: () => {} };
            }
            removeAllListeners() {}
        },
    };
}
if (!globalThis.expo) {
    globalThis.expo = {
        EventEmitter: class {
            addListener() {
                return { remove: () => {} };
            }
            removeAllListeners() {}
        },
    } as any;
}

// React integration is not exercised in unit tests so we stub the `observer`
// helper; the real implementation pulls in React and runtime helpers which
// can bring in Flow syntax (e.g. `import typeof`) and blow up the transformer.
vi.mock('@legendapp/state/react', () => ({
    observer: (Comp: any) => Comp,
}));

// stub common React Native libs used by components to avoid bringing in
// Flow-typed dependencies (react-native-paper, reanimated, safe-area-context, etc.)
vi.mock('react-native-paper', () => {
    const React = require('react');
    // render as host components defined in our react-native mock so test
    // renderer produces a tree instead of null
    return {
        Button: (props: any) => React.createElement('View', props, props.children),
        Surface: (props: any) => React.createElement('View', props, props.children),
        Text: (props: any) => React.createElement('Text', props, props.children),
        ActivityIndicator: (props: any) => React.createElement('View', props, 'loading'),
        useTheme: () => ({ colors: { actions: { success: { background: '', text: '' } } } }),
    };
});

vi.mock('react-native-reanimated', () => ({
    useAnimatedStyle: () => () => ({}),
    useSharedValue: (v: any) => ({ value: v }),
    withTiming: (v: any) => v,
}));

vi.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// several modules in react-native-virtualized-lists contain Flow syntax.
// provide mocks for both the package and its common subpaths.
vi.mock('@react-native/virtualized-lists', () => ({}));
vi.mock('@react-native/virtualized-lists/Lists/VirtualizedListContext', () => ({}));
vi.mock('@react-native/virtualized-lists/index', () => ({}));

// stub expo-localization to avoid pulling in expo-modules-core/native
vi.mock('expo-localization', () => ({
    getLocales: () => [{ languageCode: 'en' }],
    locale: 'en',
}));

// lucide icons use Flow syntax and crash the transformer; only a few icons are
// actually referenced in our components so stub them to simple host components.
vi.mock('lucide-react-native', () => {
    const React = require('react');
    const Icon = React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement('Icon', { ...props, ref }, children),
    );
    return {
        AlertCircle: Icon,
        AlertTriangle: Icon,
        Check: Icon,
    };
});

// expo-device is used indirectly by some startup logic; it requires a native
// module which isn't available in Node tests.  provide a minimal stand-in.
// include the DeviceType enum so HardwareGuard checks succeed.
// clear cache in case the module was loaded earlier in this process
try {
    delete require.cache[require.resolve('expo-device')];
} catch {}
vi.mock('expo-device', () => ({
    osName: 'iOS',
    osVersion: '14.0',
    modelName: 'Simulator',
    deviceName: 'TestDevice',
    yearClass: 2022,
    deviceType: 'PHONE',
    DeviceType: { PHONE: 'PHONE', TABLET: 'TABLET', UNKNOWN: 'UNKNOWN' },
    // provide minimal architecture list so hardware guard is happy
    supportedCpuArchitectures: ['arm64'],
    // give plenty of memory so hardware guard passes
    totalMemory: 8 * 1024 * 1024 * 1024, // 8GB
}));


vi.mock('expo-secure-store', () => mockExpoSecureStore);

const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

vi.mock('@/Service/Logger', () => ({
    AppLogger: {
        getInstance: () => mockLogger,
    },
}));

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-v4'),
    v1: vi.fn(() => 'mock-uuid-v1'),
    validate: vi.fn(() => true),
    version: vi.fn(() => 4),
}));

// Silence console warnings in tests
globalThis.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
} as typeof console;