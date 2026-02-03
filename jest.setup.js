// Mock expo modules
jest.mock('expo-audio', () => ({
    AudioRecorder: jest.fn(),
    getRecordingPermissionsAsync: jest.fn(),
    requestRecordingPermissionsAsync: jest.fn(),
    useAudioRecorder: jest.fn(),
    useAudioRecorderState: jest.fn(),
    RecordingPresets: {
        HIGH_QUALITY: {},
    },
}));

// Mock Legend-State: root get/set; per-key nodes that mutate stateRef[prop]; nested objects get a proxy so entity getField works
jest.mock('@legendapp/state', () => {
    const observable = (initial) => {
        const state = typeof initial === 'object' && initial !== null ? { ...initial } : {};
        let stateRef = state;
        const root = {
            get: () => stateRef,
            set: (v) => {
                stateRef = typeof v === 'object' && v !== null ? { ...v } : v;
            },
        };
        return new Proxy(root, {
            get(target, prop) {
                if (prop === 'get') return target.get;
                if (prop === 'set') return target.set;
                const val = stateRef[prop];
                const node = {
                    get: () => stateRef[prop],
                    set: (v) => {
                        stateRef[prop] = v;
                    },
                };
                if (typeof val !== 'object' || val === null) return node;
                const entry = val;
                return new Proxy(node, {
                    get(_, p) {
                        if (p === 'get') return node.get;
                        if (p === 'set') return node.set;
                        return {
                            get: () => entry[p],
                            set: (v) => {
                                entry[p] = v;
                            },
                        };
                    },
                });
            },
        });
    };
    return { observable };
});
// Mock Legend-State persistence (MMKV is native; use no-op in Node)
jest.mock('@legendapp/state/persist', () => ({
    persistObservable: jest.fn(),
    configureObservablePersistence: jest.fn(),
}));
jest.mock('@legendapp/state/persist-plugins/mmkv', () => ({
    ObservablePersistMMKV: {},
}));

jest.mock('expo-file-system', () => ({
    File: jest.fn(),
    Directory: jest.fn(),
    Paths: {
        document: 'file:///document',
    },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(() => Promise.resolve(null)),
    setItemAsync: jest.fn(() => Promise.resolve()),
    deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
jest.mock('@/Service/Logger', () => ({
    AppLogger: {
        getInstance: () => mockLogger,
    },
}));

// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-v4'),
    v1: jest.fn(() => 'mock-uuid-v1'),
    validate: jest.fn(() => true),
    version: jest.fn(() => 4),
}));

// Mock SecureRecorder
const mockStatusListeners = new Set();

jest.mock('./modules/secure-recorder/src/index', () => {
    const mockEmitStatus = (status) => {
        mockStatusListeners.forEach((listener) => listener(status));
    };

    return {
        SecureRecorder: {
            startRecording: jest.fn(async (sessionId) => {
                const filePath = '/mock/recording.dat';
                mockEmitStatus({
                    isRecording: true,
                    sessionId,
                    filePath,
                });
                return filePath;
            }),
            stopRecording: jest.fn(async () => {
                const filePath = '/mock/recording.dat';
                mockEmitStatus({
                    isRecording: false,
                    sessionId: null,
                    filePath,
                });
                return filePath;
            }),
            getStatus: jest.fn(() =>
                Promise.resolve({
                    isRecording: false,
                    sessionId: null,
                    filePath: null,
                }),
            ),
            hasPermission: jest.fn(() => Promise.resolve(true)),
            requestPermission: jest.fn(() => Promise.resolve(true)),
            getChunks: jest.fn(() => Promise.resolve([])),
            addStatusListener: jest.fn((listener) => {
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
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};
