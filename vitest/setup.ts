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
    const observable = (initial: unknown) => {
        const state = typeof initial === 'object' && initial !== null ? { ...(initial as object) } : initial;
        return {
            get: () => state,
            set: (value: unknown) => {
                if (typeof value === 'object' && value !== null) {
                    Object.assign(state as object, value);
                } else {
                    return value;
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