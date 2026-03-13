/**
 * FileDownloader tests.
 *
 * Verifies that the downloader uses the fetch stream and correctly falls back to
 * the native `File.downloadFileAsync` implementation when the streamed download
 * produces an empty file (Android edge case).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

let FileDownloader: typeof import('@/Service/InferenceModelDownload/FileDownloader').FileDownloader;

let mockFetch: ReturnType<typeof vi['fn']>;
let mockDownloadFileAsync: ReturnType<typeof vi['fn']>;
let mockStreamWriterInit: ReturnType<typeof vi['fn']>;
let mockStreamWriterWrite: ReturnType<typeof vi['fn']>;
let mockStreamWriterClose: ReturnType<typeof vi['fn']>;
let mockStreamWriterRelease: ReturnType<typeof vi['fn']>;

const makeDestinationFile = (size: number) => ({
    uri: 'file://mock',
    exists: true,
    create: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    get size() {
        return size;
    },
});

describe('FileDownloader', () => {
    beforeEach(async () => {
        vi.resetModules();

        mockFetch = vi.fn();
        vi.doMock('expo/fetch', () => ({
            fetch: mockFetch,
        }));

        mockDownloadFileAsync = vi.fn();
        vi.doMock('expo-file-system', () => ({
            File: {
                downloadFileAsync: mockDownloadFileAsync,
            },
        }));

        mockStreamWriterInit = vi.fn();
        mockStreamWriterWrite = vi.fn();
        mockStreamWriterClose = vi.fn();
        mockStreamWriterRelease = vi.fn();
        vi.doMock('@/Service/InferenceModelDownload/StreamWriter', () => {
            function StreamWriter() {
                return {
                    initialize: mockStreamWriterInit,
                    write: mockStreamWriterWrite,
                    close: mockStreamWriterClose,
                    release: mockStreamWriterRelease,
                };
            }

            return {
                StreamWriter,
            };
        });

        const module = await import('@/Service/InferenceModelDownload/FileDownloader');
        FileDownloader = module.FileDownloader;
    });

    it('should stream download and report progress without fallback', async () => {
        // Arrange
        const chunks = [new Uint8Array(50), new Uint8Array(50)];
        const reader = {
            read: vi
                .fn()
                .mockResolvedValueOnce({ done: false, value: chunks[0] })
                .mockResolvedValueOnce({ done: false, value: chunks[1] })
                .mockResolvedValueOnce({ done: true, value: undefined }),
        };

        mockFetch.mockResolvedValue({
            ok: true,
            headers: { get: () => '100' },
            body: { getReader: () => reader },
        });

        const file = makeDestinationFile(100);
        const downloader = new FileDownloader(file as any, { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() } as any);

        // Act
        const progress: number[] = [];
        for await (const p of downloader.download('https://example.com/model.onnx')) {
            progress.push(p);
        }

        // Assert
        expect(progress).toEqual([0, 0.5, 1]);
        expect(mockDownloadFileAsync).not.toHaveBeenCalled();
        expect(mockStreamWriterInit).toHaveBeenCalled();
        expect(mockStreamWriterWrite).toHaveBeenCalledTimes(2);
        expect(mockStreamWriterClose).toHaveBeenCalled();
        expect(mockStreamWriterRelease).toHaveBeenCalled();
    });

    it('should fall back to native download when streamed result is empty', async () => {
        // Arrange
        const reader = {
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        };

        mockFetch.mockResolvedValue({
            ok: true,
            headers: { get: () => '0' },
            body: { getReader: () => reader },
        });

        const file = makeDestinationFile(0);
        const downloader = new FileDownloader(file as any, { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() } as any);

        // Act
        const progress: number[] = [];
        for await (const p of downloader.download('https://example.com/model.onnx')) {
            progress.push(p);
        }

        // Assert
        expect(progress).toEqual([0, 1]);
        expect(mockDownloadFileAsync).toHaveBeenCalledWith('https://example.com/model.onnx', file);
    });
});
