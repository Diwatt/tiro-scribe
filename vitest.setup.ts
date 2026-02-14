/// <reference types="vitest/globals" />
import { beforeEach, vi } from 'vitest';

// Mock react-native-quick-crypto (native module fails to parse in Vitest/Rollup)
vi.mock('react-native-quick-crypto', () => {
    const NodeBuffer = typeof Buffer !== 'undefined' ? Buffer : Uint8Array;
    return {
        default: {
            createHash: () => ({
                update: () => ({
                    digest: () => ({ toString: () => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }),
                }),
            }),
            createCipheriv: () => ({
                update: () => NodeBuffer.alloc(0),
                final: () => NodeBuffer.alloc(0),
            }),
            createDecipheriv: () => ({
                update: () => NodeBuffer.alloc(0),
                final: () => NodeBuffer.alloc(0),
            }),
            pbkdf2Sync: (password: string, salt: string) => {
                // Deterministic mock: different (password,salt) => different hex so tests like "different salt => different key" pass
                const str = `${password}:${salt}`;
                let h = 0;
                for (let i = 0; i < str.length; i++) {
                    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
                }
                const hex = Math.abs(h).toString(16).padStart(64, '0').slice(0, 64);
                return Object.assign(NodeBuffer.alloc(32), {
                    toString: (enc: string) => (enc === 'hex' ? hex : ''),
                });
            },
        },
        Buffer: NodeBuffer,
    };
});

// Mock expo-crypto for Security tests (getRandomBytes, getRandomValues)
vi.mock('expo-crypto', () => ({
    getRandomBytes: (n: number) => new Uint8Array(n).fill(0),
    getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    },
}));

// Mock expo modules
vi.mock('expo-audio', () => ({
    AudioRecorder: vi.fn(),
    getRecordingPermissionsAsync: vi.fn(),
    requestRecordingPermissionsAsync: vi.fn(),
    useAudioRecorder: vi.fn(),
    useAudioRecorderState: vi.fn(),
    RecordingPresets: {
        HIGH_QUALITY: {},
    },
}));

// Mock Legend-State: root get/set; per-key nodes that mutate stateRef[prop]; nested objects get a proxy so entity getField works
vi.mock('@legendapp/state', () => {
    const observable = (initial: unknown) => {
        const state = typeof initial === 'object' && initial !== null ? { ...(initial as object) } : {};
        let stateRef = state as Record<string, unknown>;
        const root = {
            get: () => stateRef,
            set: (v: unknown) => {
                stateRef = (typeof v === 'object' && v !== null ? { ...(v as object) } : v) as Record<string, unknown>;
            },
        };
        return new Proxy(root, {
            get(target, prop) {
                if (prop === 'get') {
                    return target.get;
                }
                if (prop === 'set') {
                    return target.set;
                }
                const val = stateRef[prop as string];
                const node = {
                    get: () => stateRef[prop as string],
                    set: (v: unknown) => {
                        stateRef[prop as string] = v;
                    },
                };
                if (typeof val !== 'object' || val === null) {
                    return node;
                }
                const entry = val as Record<string, unknown>;
                return new Proxy(node, {
                    get(_, p) {
                        if (p === 'get') {
                            return node.get;
                        }
                        if (p === 'set') {
                            return node.set;
                        }
                        return {
                            get: () => entry[p as string],
                            set: (v: unknown) => {
                                entry[p as string] = v;
                            },
                        };
                    },
                });
            },
        });
    };
    return { observable };
});

vi.mock('@legendapp/state/persist', () => ({
    persistObservable: vi.fn(),
    configureObservablePersistence: vi.fn(),
}));

// MMKV removed (migrated to op-sqlite)

vi.mock('@op-engineering/op-sqlite', () => {
    const mockExecute = vi.fn(() => Promise.resolve({ rows: [] }));
    const mockTransaction = vi.fn((cb: (tx: { execute: typeof mockExecute }) => Promise<void>) => cb({ execute: mockExecute }));
    const mockDb = { execute: mockExecute, transaction: mockTransaction };
    return {
        open: vi.fn(() => mockDb),
    };
});

// Hoisted for use in vi.mock factory (vi.mock is hoisted before imports)
const { mockTableStore, createMockExecute } = vi.hoisted(() => {
    const store = new Map<string, Map<string, string>>();
    const getTableStore = (tableName: string): Map<string, string> => {
        let t = store.get(tableName);
        if (!t) {
            t = new Map();
            store.set(tableName, t);
        }
        return t;
    };
    return {
        mockTableStore: store,
        createMockExecute: () =>
            vi.fn(async (sql: string, params?: unknown[]) => {
                const args = Array.isArray(params) ? params : [];
                // INSERT INTO or INSERT OR REPLACE INTO (EntityGateway uses Kysely)
                const sqlTrimmed = sql.trim();
                const sqlLower = sqlTrimmed.toLowerCase();
                const isInsert = sqlLower.startsWith('insert into') || sqlLower.startsWith('insert or replace into');
                if (isInsert) {
                    const intoIndex = sqlLower.indexOf(' into ');
                    const afterInto = sqlTrimmed.slice(intoIndex + 6).trimStart();
                    const tableMatch = afterInto.match(/^"?(\w+)"?\s*\(/);
                    const table = tableMatch ? tableMatch[1] : (afterInto.split(/\s+/)[0]?.replace(/"/g, '') ?? 'unknown');
                    const primaryKey = args[0] as string;
                    const data = args[1] as string;
                    getTableStore(table).set(primaryKey, data);
                    return { rows: [] };
                }
                const selectMatch = sql.match(/select .+ from\s+"?(\w+)"?/i);
                if (selectMatch && (sql.toLowerCase().includes('data') || sql.toLowerCase().includes('select *'))) {
                    const table = selectMatch[1];
                    const tbl = getTableStore(table);
                    if (sql.toLowerCase().includes('where')) {
                        const primaryKey = args[0] as string;
                        const d = tbl.get(primaryKey);
                        if (d !== undefined) {
                            return { rows: [{ uuid: primaryKey, data: d }] };
                        }
                        const whereColMatch = sql.match(/where\s+"?(\w+)"?\s*=\s*\?/i);
                        if (whereColMatch && args.length >= 1) {
                            const column = whereColMatch[1];
                            const camel = column.replace(/_([a-z])/g, (_: string, l: string) => l.toUpperCase());
                            const value = args[0];
                            const filtered = Array.from(tbl.entries()).filter(([, dataStr]) => {
                                const parsed = JSON.parse(dataStr) as Record<string, unknown>;
                                return parsed[camel] === value || parsed[column] === value;
                            });
                            return { rows: filtered.map(([primaryKey, dataStr]) => ({ uuid: primaryKey, data: dataStr })) };
                        }
                        const jsonExtractMatch = sql.match(/json_extract\(data, '\$\.(\w+)'\) = \?/);
                        if (jsonExtractMatch && args.length >= 1) {
                            const key = jsonExtractMatch[1];
                            const value = args[0];
                            const filtered = Array.from(tbl.entries()).filter(([, dataStr]) => {
                                const parsed = JSON.parse(dataStr) as Record<string, unknown>;
                                return parsed[key] === value;
                            });
                            return { rows: filtered.map(([primaryKey, dataStr]) => ({ uuid: primaryKey, data: dataStr })) };
                        }
                        return { rows: [] };
                    }
                    const rows = Array.from(tbl.entries()).map(([primaryKey, data]) => ({ uuid: primaryKey, data }));
                    const limitOffsetMatch = sql.match(/limit \? offset \?/i);
                    const limitOnlyMatch = sql.match(/limit \?/i) && !sql.match(/offset \?/i);
                    if (limitOffsetMatch && args.length >= 2) {
                        const limitVal = (args[args.length - 2] as number) ?? 1000;
                        const offsetVal = (args[args.length - 1] as number) ?? 0;
                        return { rows: rows.slice(offsetVal, offsetVal + limitVal) };
                    }
                    if (limitOnlyMatch && args.length >= 1) {
                        const limitVal = (args[args.length - 1] as number) ?? 1000;
                        return { rows: rows.slice(0, limitVal) };
                    }
                    return { rows };
                }
                if (sql.toLowerCase().includes('select 1') || sql.toLowerCase().includes('select 1 as')) {
                    const tableMatch = sql.match(/from\s+"?(\w+)"?/i);
                    if (tableMatch) {
                        const primaryKey = args[0] as string;
                        const has = getTableStore(tableMatch[1]).has(primaryKey);
                        return { rows: has ? [{ 1: 1 }] : [] };
                    }
                }
                const deleteMatch = sql.match(/delete from\s+"?(\w+)"?/i);
                if (deleteMatch) {
                    const table = deleteMatch[1];
                    if (sql.toLowerCase().includes('where')) {
                        getTableStore(table).delete(args[0] as string);
                    } else {
                        getTableStore(table).clear();
                    }
                    return { rows: [] };
                }
                return { rows: [] };
            }),
    };
});

export { mockTableStore };

vi.mock('@/Database/Database', () => {
    const mockExecute = createMockExecute();
    const mockTransaction = vi.fn((cb: (tx: { execute: typeof mockExecute }) => Promise<void>) => cb({ execute: mockExecute }));
    const mockDb = { execute: mockExecute, transaction: mockTransaction };
    return {
        Database: {
            getConnection: vi.fn(() => mockDb),
            initialize: vi.fn(() => Promise.resolve()),
        },
        registry: {},
    };
});

vi.mock('expo-file-system', () => ({
    File: vi.fn(),
    Directory: vi.fn(),
    Paths: {
        document: 'file:///document',
    },
}));

vi.mock('expo-secure-store', () => ({
    getItemAsync: vi.fn(() => Promise.resolve(null)),
    setItemAsync: vi.fn(() => Promise.resolve()),
    deleteItemAsync: vi.fn(() => Promise.resolve()),
}));

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

const mockStatusListeners = new Set<(status: unknown) => void>();

vi.mock('./modules/secure-recorder/src/index', () => {
    const mockEmitStatus = (status: unknown) => {
        mockStatusListeners.forEach((listener) => {
            listener(status);
        });
    };

    return {
        SecureRecorder: {
            startRecording: vi.fn(async (sessionId: string) => {
                const filePath = '/mock/recording.dat';
                mockEmitStatus({
                    isRecording: true,
                    sessionId,
                    filePath,
                });
                return filePath;
            }),
            stopRecording: vi.fn(async () => {
                const filePath = '/mock/recording.dat';
                mockEmitStatus({
                    isRecording: false,
                    sessionId: null,
                    filePath,
                });
                return filePath;
            }),
            getStatus: vi.fn(() =>
                Promise.resolve({
                    isRecording: false,
                    sessionId: null,
                    filePath: null,
                }),
            ),
            hasPermission: vi.fn(() => Promise.resolve(true)),
            requestPermission: vi.fn(() => Promise.resolve(true)),
            getChunks: vi.fn(() => Promise.resolve([])),
            addStatusListener: vi.fn((listener: (status: unknown) => void) => {
                mockStatusListeners.add(listener);
                return {
                    remove: () => {
                        mockStatusListeners.delete(listener);
                    },
                };
            }),
        },
    };
});

// Clear DB mock between tests
beforeEach(() => {
    mockTableStore.clear();
});

// Silence console warnings in tests
globalThis.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
} as typeof console;
