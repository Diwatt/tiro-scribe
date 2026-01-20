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

jest.mock('expo-file-system', () => ({
    File: jest.fn(),
    Directory: jest.fn(),
    Paths: {
        document: 'file:///document',
    },
}));

jest.mock('@/Util/Logger', () => ({
    log: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
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
