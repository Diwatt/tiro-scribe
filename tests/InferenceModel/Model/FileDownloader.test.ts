/**
 * FileDownloader tests.
 *
 * Tests the native download using Expo 55's File.downloadFileAsync.
 * The onProgress option is passed through but silently ignored by v55.0.19.
 */

import { FileDownloader } from '@/InferenceModel/Download/FileDownloader';
import { InferenceModelDownloaderException } from '@/Exception';
import type { File } from 'expo-file-system';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDownloadedFile = {
    uri: 'file://cache/model.onnx',
    exists: true,
    copy: jest.fn(),
    delete: jest.fn(),
};

const mockDownloadFileAsync = jest.fn().mockResolvedValue(mockDownloadedFile);

jest.mock('expo-file-system', () => ({
    File: {
        downloadFileAsync: (...args: unknown[]) => mockDownloadFileAsync(...args),
    },
    Directory: class MockDirectory {
        uri: string;
        constructor(uri: string) {
            this.uri = uri;
        }
    },
}));

const makeLogger = () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

const makeParentDirectory = (overrides?: Partial<{ exists: boolean; create: jest.Mock }>) => ({
    exists: false,
    create: jest.fn(),
    ...overrides,
});

const makeFile = (overrides?: Partial<{
    uri: string;
    exists: boolean;
    size: number;
    delete: jest.Mock;
    parentDirectory: ReturnType<typeof makeParentDirectory>;
}>) => ({
    uri: 'file://models/model.onnx',
    exists: true,
    size: 1024,
    delete: jest.fn(),
    parentDirectory: makeParentDirectory(),
    ...overrides,
});

/**
 * Extract the onProgress callback from the options passed to File.downloadFileAsync
 * and simulate a native progress event.
 */
function simulateNativeProgress(bytesWritten: number, totalBytes: number): void {
    const lastCall = mockDownloadFileAsync.mock.lastCall;
    if (!lastCall) return;

    const options = lastCall[2] as Record<string, unknown> | undefined;
    const onProgress = options?.onProgress as ((data: { bytesWritten: number; totalBytes: number }) => void) | undefined;
    onProgress?.({ bytesWritten, totalBytes });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FileDownloader', () => {
    let mockLogger: ReturnType<typeof makeLogger>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = makeLogger();
        mockDownloadFileAsync.mockResolvedValue(mockDownloadedFile);
    });

    describe('download', () => {
        it('should call File.downloadFileAsync with idempotent option', async () => {
            const parentDir = makeParentDirectory({ exists: true });
            const mockFile = makeFile({ parentDirectory: parentDir }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(mockDownloadFileAsync).toHaveBeenCalledTimes(1);
            const [, destination, options] = mockDownloadFileAsync.mock.lastCall!;
            expect(destination).toBe(parentDir);
            expect(options).toMatchObject({ idempotent: true });
        });

        it('should create parent directory when it does not exist', async () => {
            const parentDir = makeParentDirectory({ exists: false });
            const mockFile = makeFile({ parentDirectory: parentDir }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(parentDir.create).toHaveBeenCalled();
        });

        it('should not create parent directory when it already exists', async () => {
            const parentDir = makeParentDirectory({ exists: true });
            const mockFile = makeFile({ parentDirectory: parentDir }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(parentDir.create).not.toHaveBeenCalled();
        });

        it('should delete existing destination file before download', async () => {
            const mockFile = makeFile({ exists: true, delete: jest.fn() }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(mockFile.delete).toHaveBeenCalled();
        });

        it('should copy downloaded file when URI differs from destination', async () => {
            const parentDir = makeParentDirectory({ exists: true });
            const mockFile = makeFile({
                uri: 'file://models/target-model.onnx',
                parentDirectory: parentDir,
            }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(mockDownloadedFile.copy).toHaveBeenCalledWith(mockFile);
            expect(mockDownloadedFile.delete).toHaveBeenCalled();
        });

        it('should not copy file when downloaded URI matches destination', async () => {
            const parentDir = makeParentDirectory({ exists: true });
            const mockFile = makeFile({
                uri: 'file://cache/model.onnx',
                parentDirectory: parentDir,
            }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(mockDownloadedFile.copy).not.toHaveBeenCalled();
            expect(mockDownloadedFile.delete).not.toHaveBeenCalled();
        });

        it('should throw InferenceModelDownloaderException when download fails', async () => {
            mockDownloadFileAsync.mockRejectedValue(new Error('Network error'));
            const mockFile = makeFile() as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await expect(downloader.download('https://example.com/model.onnx', 1024)).rejects.toThrow(
                InferenceModelDownloaderException,
            );
        });

        it('should throw InferenceModelDownloaderException when file is missing after download', async () => {
            const mockFile = makeFile({ exists: false }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await expect(downloader.download('https://example.com/model.onnx', 1024)).rejects.toThrow(
                InferenceModelDownloaderException,
            );
            await expect(downloader.download('https://example.com/model.onnx', 1024)).rejects.toThrow(
                /Download completed but file does not exist/,
            );
        });

        it('should not pass onProgress in options when callback is not provided', async () => {
            const mockFile = makeFile() as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            const [, , options] = mockDownloadFileAsync.mock.lastCall!;
            expect(options).not.toHaveProperty('onProgress');
        });

        it('should pass onProgress in options when callback is provided', async () => {
            const mockFile = makeFile() as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);
            const onProgress = jest.fn();

            await downloader.download('https://example.com/model.onnx', 1024, onProgress);

            const [, , options] = mockDownloadFileAsync.mock.lastCall!;
            expect(options).toHaveProperty('onProgress');
            expect(typeof (options as Record<string, unknown>).onProgress).toBe('function');
        });

        it('should report progress via onProgress callback from native events', async () => {
            const mockFile = makeFile() as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);
            const onProgress = jest.fn();

            const downloadPromise = downloader.download('https://example.com/model.onnx', 1000, onProgress);

            simulateNativeProgress(250, 1000);
            simulateNativeProgress(500, 1000);
            simulateNativeProgress(750, 1000);

            await downloadPromise;

            expect(onProgress).toHaveBeenCalledWith(0.25);
            expect(onProgress).toHaveBeenCalledWith(0.5);
            expect(onProgress).toHaveBeenCalledWith(0.75);
            expect(onProgress).toHaveBeenLastCalledWith(1);
        });

        it('should cap progress at 0.99 from native events before completion', async () => {
            const mockFile = makeFile() as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);
            const onProgress = jest.fn();

            const downloadPromise = downloader.download('https://example.com/model.onnx', 1000, onProgress);

            simulateNativeProgress(1000, 1000);
            await downloadPromise;

            // Native event at 100% should be capped to 0.99
            expect(onProgress).toHaveBeenCalledWith(0.99);
            // Final forced call should be 1.0
            expect(onProgress).toHaveBeenLastCalledWith(1);
        });

        it('should handle native progress with totalBytes of -1 (unknown)', async () => {
            const mockFile = makeFile() as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);
            const onProgress = jest.fn();

            const downloadPromise = downloader.download('https://example.com/model.onnx', 1000, onProgress);

            simulateNativeProgress(500, -1);
            await downloadPromise;

            // When totalBytes is -1, progress should be 0
            expect(onProgress).toHaveBeenCalledWith(0);
            expect(onProgress).toHaveBeenLastCalledWith(1);
        });

        it('should log warning when actual size differs from expected', async () => {
            const mockFile = makeFile({ size: 512 }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Size mismatch'),
            );
        });

        it('should not log warning when actual size matches expected', async () => {
            const mockFile = makeFile({ size: 1024 }) as unknown as File;
            const downloader = new FileDownloader(mockFile, mockLogger as any);

            await downloader.download('https://example.com/model.onnx', 1024);

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
