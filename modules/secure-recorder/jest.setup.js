// Mock expo-audio for tests
jest.mock('expo-audio', () => ({
    requestRecordingPermissionsAsync: jest.fn(),
    getRecordingPermissionsAsync: jest.fn(),
    PermissionStatus: {
        UNDETERMINED: 'undetermined',
        GRANTED: 'granted',
        DENIED: 'denied',
    },
}));
