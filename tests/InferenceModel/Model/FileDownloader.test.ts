/**
 * FileDownloader tests.
 *
 * Tests the native download using expo-file-system's File.downloadFileAsync.
 */

import { FileDownloader } from '@/InferenceModel/Download/FileDownloader';

// Mock expo-file-system
const mockDownloadedFile = {
    uri: 'file://test/model.onnx',
    exists: true,
    size: 1024,
};

const mockDownloadFileAsync = jest.fn().mockResolvedValue(mockDownloadedFile);

jest.mock('expo-file-system', () => ({
    File: {
        downloadFileAsync: (...args: unknown[]) => mockDownloadFileAsync(...args),
    },
    Directory: jest.fn().mockImplementation((path: string) => ({
        path,
        exists: false,
        create: jest.fn(),
    })),
}));

const makeLogger = () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

const makeFile = (overrides?: Partial<{ uri: string; exists: boolean; size: number; parentDirectory: any }>) => ({
    uri: 'file://test/model.onnx',
    exists: false,
    size: 1024,
    delete: jest.fn(),
    copy: jest.fn(),
    parentDirectory: {
        exists: false,
        create: jest.fn(),
    },
    ...overrides,
});

describe('FileDownloader', () => {
    let mockLogger: ReturnType<typeof makeLogger>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = makeLogger();
        mockDownloadFileAsync.mockResolvedValue(mockDownloadedFile);
    });

    describe('download', () => {
        it('should yield 0 then 1 for invalid totalBytes', async () => {
            const mockFile = makeFile();
            const downloader = new FileDownloader(mockFile as any, mockLogger);
            const progress: number[] = [];

            for await (const p of downloader.download('https://example.com/model.onnx', 0)) {
                progress.push(p);
            }

            expect(progress).toEqual([0, 1]);
            expect(mockDownloadFileAsync).not.toHaveBeenCalled();
        });

        it('should call File.downloadFileAsync with correct URL and parent directory', async () => {
            const mockFile = makeFile({ exists: true, size: 1024 });
            const downloader = new FileDownloader(mockFile as any, mockLogger);
            const progress: number[] = [];

            for await (const p of downloader.download('https://example.com/model.onnx', 1024)) {
                progress.push(p);
            }

            expect(progress).toEqual([0, 1]);
            expect(mockDownloadFileAsync).toHaveBeenCalledTimes(1);
            expect(mockDownloadFileAsync).toHaveBeenCalledWith(
                'https://example.com/model.onnx',
                expect.anything(), // parent directory
            );
        });

        it('should delete stale file before downloading', async () => {
            const mockFile = makeFile({ exists: true });
            const downloader = new FileDownloader(mockFile as any, mockLogger);

            for await (const _ of downloader.download('https://example.com/model.onnx', 1024)) {
                // consume
            }

            expect(mockFile.delete).toHaveBeenCalled();
        });

        it('should throw InferenceModelDownloaderException on download failure', async () => {
            mockDownloadFileAsync.mockRejectedValue(new Error('Network error'));

            const mockFile = makeFile();
            const downloader = new FileDownloader(mockFile as any, mockLogger);

            await expect(async () => {
                for await (const _ of downloader.download('https://example.com/model.onnx', 1024)) {
                    // consume
                }
            }).rejects.toThrow('Failed to download file');
        });

        it('should throw when downloaded file does not exist', async () => {
            mockDownloadFileAsync.mockResolvedValue({
                uri: 'file://test/model.onnx',
                exists: true,
                size: 1024,
            });
            // Simulate the destination file not existing after download
            const mockFile = makeFile({ exists: false, size: 0 });

            const downloader = new FileDownloader(mockFile as any, mockLogger);

            await expect(async () => {
                for await (const _ of downloader.download('https://example.com/model.onnx', 1024)) {
                    // consume
                }
            }).rejects.toThrow('Download completed but file does not exist');
        });

        it('should warn when downloaded file size differs from expected', async () => {
            mockDownloadFileAsync.mockResolvedValue({
                uri: 'file://test/model.onnx',
                exists: true,
                size: 512,
            });
            const mockFile = makeFile({ exists: true, size: 512 });

            const downloader = new FileDownloader(mockFile as any, mockLogger);

            for await (const _ of downloader.download('https://example.com/model.onnx', 1024)) {
                // consume
            }

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Size mismatch'),
            );
        });
    });
});
