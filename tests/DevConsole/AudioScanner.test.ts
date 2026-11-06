jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

jest.mock('expo-file-system/legacy', () => ({
    documentDirectory: '/documents/',
    getInfoAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
}));

import { AudioScanner } from '@/DevConsole/Ingest/AudioScanner';
import type { FileInfo } from 'expo-file-system/legacy';
import { getInfoAsync, readDirectoryAsync } from 'expo-file-system/legacy';

const mockGetInfoAsync = jest.mocked(getInfoAsync);
const mockReadDirectoryAsync = jest.mocked(readDirectoryAsync);

const DIRECTORY = '/data/user/0/com.tiroscribe.app/files';

const existingDirectory = (): FileInfo => ({
    uri: 'file:///mock',
    exists: true,
    isDirectory: true,
    size: 0,
    modificationTime: 0,
});

const fileOfSize = (size: number): FileInfo => ({
    uri: 'file:///mock',
    exists: true,
    isDirectory: false,
    size,
    modificationTime: 0,
});

const missingEntry = (): FileInfo => ({
    uri: 'file:///mock',
    exists: false,
    isDirectory: false,
});

describe('AudioScanner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetInfoAsync.mockResolvedValue(fileOfSize(96_078));
    });

    it('queries the directory through a file:// URI', async () => {
        mockReadDirectoryAsync.mockResolvedValueOnce([]);

        await new AudioScanner().scan(DIRECTORY);

        expect(mockGetInfoAsync).toHaveBeenCalledWith(`file://${DIRECTORY}`);
        expect(mockReadDirectoryAsync).toHaveBeenCalledWith(`file://${DIRECTORY}`);
    });

    it('returns an empty list when the directory does not exist', async () => {
        mockGetInfoAsync.mockResolvedValueOnce(missingEntry());

        const entries = await new AudioScanner().scan(DIRECTORY);

        expect(entries).toEqual([]);
        expect(mockReadDirectoryAsync).not.toHaveBeenCalled();
    });

    it('keeps only audio files with their bare path and source size', async () => {
        mockReadDirectoryAsync.mockResolvedValueOnce(['speech_thomas_16k.wav', 'notes.txt', 'mel_filters.json']);

        const entries = await new AudioScanner().scan(DIRECTORY);

        expect(entries).toHaveLength(1);
        expect(entries[0].name).toBe('speech_thomas_16k.wav');
        expect(entries[0].path).toBe(`${DIRECTORY}/speech_thomas_16k.wav`);
        expect(entries[0].sizeBytes).toBe(96_078);
        expect(mockGetInfoAsync).toHaveBeenCalledWith(`file://${DIRECTORY}/speech_thomas_16k.wav`);
    });

    it('reports the encrypted sibling when the .dat already exists', async () => {
        mockReadDirectoryAsync.mockResolvedValueOnce(['speech_thomas_16k.wav']);
        mockGetInfoAsync.mockImplementation(async (path: string): Promise<FileInfo> =>
            path.includes('speech_thomas_16k.wav.dat') ? fileOfSize(192_078) : fileOfSize(96_078),
        );

        const entries = await new AudioScanner().scan(DIRECTORY);

        expect(entries[0].encryptedPath).toBe('/documents/speech_thomas_16k.wav.dat');
        expect(entries[0].isEncrypted).toBe(true);
        expect(mockGetInfoAsync).toHaveBeenCalledWith('file:///documents/speech_thomas_16k.wav.dat');
    });

    it('reports no encrypted sibling when the .dat is missing', async () => {
        mockReadDirectoryAsync.mockResolvedValueOnce(['speech_thomas_16k.wav']);
        mockGetInfoAsync.mockImplementation(async (path: string): Promise<FileInfo> =>
            path.includes('speech_thomas_16k.wav.dat') ? missingEntry() : fileOfSize(96_078),
        );

        const entries = await new AudioScanner().scan(DIRECTORY);

        expect(entries[0].encryptedPath).toBeNull();
        expect(entries[0].isEncrypted).toBe(false);
    });
});
