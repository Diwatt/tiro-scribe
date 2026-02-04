/// <reference types="vitest/globals" />
import { vi } from 'vitest';

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
                if (prop === 'get') return target.get;
                if (prop === 'set') return target.set;
                const val = stateRef[prop as string];
                const node = {
                    get: () => stateRef[prop as string],
                    set: (v: unknown) => {
                        stateRef[prop as string] = v;
                    },
                };
                if (typeof val !== 'object' || val === null) return node;
                const entry = val as Record<string, unknown>;
                return new Proxy(node, {
                    get(_, p) {
                        if (p === 'get') return node.get;
                        if (p === 'set') return node.set;
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

vi.mock('@legendapp/state/persist-plugins/mmkv', () => ({
    ObservablePersistMMKV: {},
}));

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
        mockStatusListeners.forEach((listener) => listener(status));
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

// Silence console warnings in tests
globalThis.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
} as typeof console;
