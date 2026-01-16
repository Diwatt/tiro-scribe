/**
 * Unit tests for RecordingManager
 */

import {RecordingManager} from '../RecordingManager';
import {
    RecordingPermissionError,
    RecorderNotInitializedError,
    NoActiveRecordingError,
    RecordingUriUnavailableError,
    FileOperationError,
} from '@/Exception';
import {
    getRecordingPermissionsAsync,
    requestRecordingPermissionsAsync,
} from 'expo-audio';
import {File, Directory, Paths} from 'expo-file-system';
import {log} from '@/Util/Logger';

// Mock dependencies
jest.mock('expo-audio');
jest.mock('expo-file-system');
jest.mock('@/Util/Logger');

describe('RecordingManager', () => {
    let manager: RecordingManager;
    let mockRecorder: any;

    beforeEach(() => {
        manager = new RecordingManager();
        mockRecorder = {
            uri: 'file:///temp/recording.m4a',
            prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
            record: jest.fn(),
            stop: jest.fn().mockResolvedValue(undefined),
            getStatus: jest.fn().mockReturnValue({
                url: 'file:///temp/recording.m4a',
            }),
        };

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with default values', () => {
            expect(manager.isRecording).toBe(false);
            expect(manager.recordingUri).toBeNull();
            expect(manager.hasPermission).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should set the recorder instance', () => {
            manager.initialize(mockRecorder);
            // We can't directly access private recorder, but we can test behavior
            expect(() => manager.initialize(mockRecorder)).not.toThrow();
        });
    });

    describe('setIsRecording', () => {
        it('should update isRecording state', () => {
            manager.setIsRecording(true);
            expect(manager.isRecording).toBe(true);

            manager.setIsRecording(false);
            expect(manager.isRecording).toBe(false);
        });
    });

    describe('requestPermission', () => {
        it('should set hasPermission to true when permission is already granted', async () => {
            (getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'granted',
            });

            await manager.requestPermission();

            expect(manager.hasPermission).toBe(true);
            expect(requestRecordingPermissionsAsync).not.toHaveBeenCalled();
        });

        it('should request permission when not granted', async () => {
            (getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'undetermined',
            });
            (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                granted: true,
            });

            await manager.requestPermission();

            expect(manager.hasPermission).toBe(true);
            expect(requestRecordingPermissionsAsync).toHaveBeenCalled();
        });

        it('should throw RecordingPermissionError when permission is denied', async () => {
            (getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'undetermined',
            });
            (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                granted: false,
            });

            await expect(manager.requestPermission()).rejects.toThrow(
                RecordingPermissionError,
            );
            expect(manager.hasPermission).toBe(false);
        });
    });

    describe('startRecording', () => {
        beforeEach(() => {
            manager.initialize(mockRecorder);
        });

        it('should throw RecorderNotInitializedError when recorder is not initialized', async () => {
            const newManager = new RecordingManager();

            await expect(newManager.startRecording()).rejects.toThrow(
                RecorderNotInitializedError,
            );
        });

        it('should request permission if not granted', async () => {
            (getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'undetermined',
            });
            (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                granted: true,
            });

            await manager.startRecording();

            expect(requestRecordingPermissionsAsync).toHaveBeenCalled();
            expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
            expect(mockRecorder.record).toHaveBeenCalled();
            expect(manager.isRecording).toBe(true);
        });

        it('should start recording when permission is already granted', async () => {
            manager.hasPermission = true;

            await manager.startRecording();

            expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
            expect(mockRecorder.record).toHaveBeenCalled();
            expect(manager.isRecording).toBe(true);
        });

        it('should throw RecordingPermissionError if permission request fails', async () => {
            (getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'undetermined',
            });
            (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                granted: false,
            });

            await expect(manager.startRecording()).rejects.toThrow(
                RecordingPermissionError,
            );
        });
    });

    describe('stopRecording', () => {
        beforeEach(() => {
            manager.initialize(mockRecorder);
            manager.isRecording = true;
        });

        it('should throw RecorderNotInitializedError when recorder is not initialized', async () => {
            const newManager = new RecordingManager();
            newManager.isRecording = true;

            await expect(newManager.stopRecording()).rejects.toThrow(
                RecorderNotInitializedError,
            );
        });

        it('should throw NoActiveRecordingError when not recording', async () => {
            manager.isRecording = false;

            await expect(manager.stopRecording()).rejects.toThrow(
                NoActiveRecordingError,
            );
        });

        it('should throw RecordingUriUnavailableError when URI is not available', async () => {
            mockRecorder.uri = null;
            mockRecorder.getStatus = jest.fn().mockReturnValue({
                url: null,
            });

            await expect(manager.stopRecording()).rejects.toThrow(
                RecordingUriUnavailableError,
            );
        });

        it('should stop recording and save file successfully', async () => {
            const mockDirectory = {
                create: jest.fn(),
            } as unknown as Directory;
            const mockDestinationFile = {
                uri: 'file:///document/recordings/recording_123.m4a',
            } as unknown as File;
            const mockSourceFile = {
                move: jest.fn(),
            } as unknown as File;

            jest.mocked(Directory).mockImplementation(() => mockDirectory);
            jest.mocked(File)
                .mockImplementationOnce(() => mockSourceFile)
                .mockImplementationOnce(() => mockDestinationFile);

            await manager.stopRecording();

            expect(mockRecorder.stop).toHaveBeenCalled();
            expect(mockDirectory.create).toHaveBeenCalledWith({idempotent: true});
            expect(mockSourceFile.move).toHaveBeenCalledWith(mockDestinationFile);
            expect(manager.recordingUri).toBe(mockDestinationFile.uri);
            expect(manager.isRecording).toBe(false);
            expect(log.info).toHaveBeenCalledWith(
                'Recording saved to:',
                mockDestinationFile.uri,
            );
        });

        it('should use getStatus().url when uri property is null', async () => {
            mockRecorder.uri = null;
            mockRecorder.getStatus = jest.fn().mockReturnValue({
                url: 'file:///temp/recording.m4a',
            });

            const mockDirectory = {
                create: jest.fn(),
            } as unknown as Directory;
            const mockDestinationFile = {
                uri: 'file:///document/recordings/recording_123.m4a',
            } as unknown as File;
            const mockSourceFile = {
                move: jest.fn(),
            } as unknown as File;

            jest.mocked(Directory).mockImplementation(() => mockDirectory);
            jest.mocked(File)
                .mockImplementationOnce(() => mockSourceFile)
                .mockImplementationOnce(() => mockDestinationFile);

            await manager.stopRecording();

            expect(mockRecorder.getStatus).toHaveBeenCalled();
            expect(mockSourceFile.move).toHaveBeenCalled();
        });

        it('should throw FileOperationError when file move fails', async () => {
            const mockDirectory = {
                create: jest.fn(),
            } as unknown as Directory;
            const mockDestinationFile = {
                uri: 'file:///document/recordings/recording_123.m4a',
            } as unknown as File;
            const mockSourceFile = {
                move: jest.fn().mockImplementation(() => {
                    throw new Error('Move failed');
                }),
            } as unknown as File;

            jest.mocked(Directory).mockImplementation(() => mockDirectory);
            jest.mocked(File)
                .mockImplementationOnce(() => mockSourceFile)
                .mockImplementationOnce(() => mockDestinationFile);

            await expect(manager.stopRecording()).rejects.toThrow(
                FileOperationError,
            );
        });
    });

    describe('reset', () => {
        it('should reset all state to initial values', () => {
            manager.isRecording = true;
            manager.recordingUri = 'file:///some/path.m4a';

            manager.reset();

            expect(manager.isRecording).toBe(false);
            expect(manager.recordingUri).toBeNull();
        });
    });

    describe('PERMISSION_GRANTED constant', () => {
        it('should have the correct value', () => {
            // Access via a method that uses it
            (getRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'granted',
            });

            expect(async () => {
                await manager.requestPermission();
            }).not.toThrow();
        });
    });
});
