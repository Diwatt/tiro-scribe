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

// Silence console warnings in tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};
