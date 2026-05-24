/**
 * DownloadTaskExecutor tests.
 *
 * Tests the download task execution with mocked FileDownloader (Promise-based)
 * and ChecksumVerifier. Verifies per-file progress reaches 100%, overall
 * progress calculation for multiple files, and correct lifecycle state
 * transitions.
 */

import type { InferenceModelFile, ModelConfig } from '@/Api';
import { InferenceModelDownloaderException } from '@/Exception';
import { DownloadQueue } from '@/Entity/DownloadQueue';
import { DownloadState } from '@/InferenceModel/Download/Type';
import type { AppLogger } from '@/Core/AppLogger';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDownload = jest.fn().mockImplementation(async (_url: string, _totalBytes: number, onProgress?: (p: number) => void) => {
    // Simulate the polling callbacks that FileDownloader fires
    if (onProgress) {
        onProgress(0.5);
        onProgress(1);
    }
});
const mockVerify = jest.fn().mockResolvedValue(undefined);
const mockGetFile = jest.fn().mockReturnValue({ uri: 'file://models/test-file.bin' });
const mockEnsureDirectories = jest.fn().mockResolvedValue(undefined);

jest.mock('@/InferenceModel/Download/FileDownloader', () => ({
    FileDownloader: jest.fn().mockImplementation(() => ({
        download: mockDownload,
    })),
}));

jest.mock('@/InferenceModel/Download/ChecksumVerifier', () => ({
    ChecksumVerifier: jest.fn().mockImplementation(() => ({
        verify: mockVerify,
    })),
}));

jest.mock('@/InferenceModel/Download/ModelArtifactStorage', () => ({
    ModelArtifactStorage: jest.fn().mockImplementation(() => ({
        getFile: mockGetFile,
        ensureDirectories: mockEnsureDirectories,
    })),
}));

// DownloadQueue.createCompleted needs uuid which may not work in test env
jest.mock('@/Entity/DownloadQueue', () => ({
    DownloadQueue: {
        createCompleted: jest.fn().mockReturnValue({
            capability: 'test_capability',
            status: 'completed',
            progressPercent: 100,
            errorMessage: '',
        }),
    },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { DownloadTaskExecutor } from '@/InferenceModel/Download/DownloadTaskExecutor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeLogger = (): AppLogger => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    getExtensions: jest.fn(() => []),
    setSeverity: jest.fn(() => 'debug'),
    getSeverity: jest.fn(() => 'debug'),
    patchConsole: jest.fn(),
} as unknown as AppLogger);

const makeFile = (overrides: Partial<InferenceModelFile> = {}): InferenceModelFile => ({
    url: 'https://example.com/models/file-a.bin',
    hash: 'abc123',
    sizeBytes: 1024,
    ...overrides,
});

const makeConfig = (files: InferenceModelFile[] = [makeFile()]): ModelConfig => ({
    id: 'model-1',
    version: '1.0.0',
    files,
    minAppVersion: '1.0.0',
    requirements: {},
    capability: 'test_capability',
});

const makeQueueEntity = (): DownloadQueue =>
    DownloadQueue.createCompleted('test_capability') as unknown as DownloadQueue;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DownloadTaskExecutor', () => {
    let mockLogger: ReturnType<typeof makeLogger>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = makeLogger();
    });

    describe('start', () => {
        it('should set currentFileProgress to 100 after each file downloads', async () => {
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            await executor.start();

            // final onProgress(1) → 100%
            expect(executor.currentFileProgress$.get()).toBe(100);
        });

        it('should call checksumVerifier.verify after download completes', async () => {
            const file = makeFile();
            const config = makeConfig([file]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            await executor.start();

            expect(mockVerify).toHaveBeenCalledTimes(1);
            expect(mockVerify).toHaveBeenCalledWith(
                { uri: 'file://models/test-file.bin' },
                file.hash,
            );
        });

        it('should calculate overall progress correctly for multiple files', async () => {
            const fileA = makeFile({ url: 'https://example.com/a.bin', sizeBytes: 1000 });
            const fileB = makeFile({ url: 'https://example.com/b.bin', sizeBytes: 3000 });
            const config = makeConfig([fileA, fileB]);

            const progressValues: number[] = [];
            const onProgress = (progress: number) => {
                progressValues.push(progress);
            };

            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                onProgress,
            );

            await executor.start();

            // Each file's downloader fires onProgress(0.5) then onProgress(1)
            // File A: 0 + 0.5*1000 / 4000 = 12.5%, 0 + 1*1000 / 4000 = 25%
            // File B: 1000 + 0.5*3000 / 4000 = 62.5%, 1000 + 1*3000 / 4000 = 100%
            expect(progressValues).toEqual([12.5, 25, 62.5, 100]);
            expect(executor.progress$.get()).toBe(100);
        });

        it('should set currentFileName for each file in sequence', async () => {
            const fileA = makeFile({ url: 'https://example.com/models/alpha.bin' });
            const fileB = makeFile({ url: 'https://example.com/models/bravo.bin' });
            const config = makeConfig([fileA, fileB]);

            const fileNames: string[] = [];
            const onProgress = () => {
                const name = executor.currentFileName$.get();
                if (name && name !== fileNames[fileNames.length - 1]) {
                    fileNames.push(name);
                }
            };

            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                onProgress,
            );

            await executor.start();

            expect(fileNames).toEqual(['alpha.bin', 'bravo.bin']);
        });

        it('should transition through Pending → Downloading → Completed', async () => {
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            expect(executor.getState()).toBe(DownloadState.Completed); // from createCompleted mock

            await executor.start();

            expect(executor.getState()).toBe(DownloadState.Completed);
            expect(executor.getProgress()).toBe(100);
        });

        it('should transition to Failed when download throws', async () => {
            mockDownload.mockRejectedValueOnce(new Error('Network failure'));

            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            await expect(executor.start()).rejects.toThrow('Network failure');

            expect(executor.getState()).toBe(DownloadState.Failed);
            expect(executor.getError()).toBe('Network failure');
        });

        it('should transition to Failed when checksum verification throws', async () => {
            mockVerify.mockRejectedValueOnce(
                new InferenceModelDownloaderException('Hash mismatch for file'),
            );

            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            await expect(executor.start()).rejects.toThrow('Hash mismatch for file');

            expect(executor.getState()).toBe(DownloadState.Failed);
        });

        it('should update currentFileProgress$ with intermediate values during download', async () => {
            const config = makeConfig([makeFile({ sizeBytes: 2000 })]);

            const fileProgressValues: number[] = [];
            const onProgress = () => {
                fileProgressValues.push(executor.currentFileProgress$.get());
            };

            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                onProgress,
            );

            await executor.start();

            // Mock fires onProgress(0.5) → 50%, then onProgress(1) → 100%
            expect(fileProgressValues).toEqual([50, 100]);
        });

        it('should call onComplete callback after successful download', async () => {
            const onComplete = jest.fn().mockResolvedValue(undefined);
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                undefined,
                undefined,
                onComplete,
            );

            await executor.start();

            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('should call onError callback when download fails', async () => {
            mockDownload.mockRejectedValueOnce(new Error('disk full'));
            const onError = jest.fn().mockResolvedValue(undefined);
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                undefined,
                onError,
            );

            await expect(executor.start()).rejects.toThrow('disk full');

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'disk full' }));
        });

        it('should pass onProgress callback to downloader for real-time updates', async () => {
            const file = makeFile({ sizeBytes: 1000 });
            const config = makeConfig([file]);

            const executorProgressValues: number[] = [];
            const onProgress = (progress: number) => {
                executorProgressValues.push(progress);
            };

            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                onProgress,
            );

            await executor.start();

            // The mock downloader fires onProgress(0.5) then onProgress(1)
            // 0.5: (0 + 0.5 * 1000) / 1000 * 100 = 50%
            // 1.0: (0 + 1 * 1000) / 1000 * 100 = 100%
            expect(executorProgressValues).toEqual([50, 100]);
        });

        it('should call onProgress callback for each file', async () => {
            const fileA = makeFile({ url: 'https://example.com/a.bin', sizeBytes: 500 });
            const fileB = makeFile({ url: 'https://example.com/b.bin', sizeBytes: 500 });
            const config = makeConfig([fileA, fileB]);

            const onProgress = jest.fn();
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                onProgress,
            );

            await executor.start();

            // Each file's mock fires onProgress(0.5) then onProgress(1)
            // File A: 0.5 → (0+250)/1000=25%, 1.0 → (0+500)/1000=50%
            // File B: 0.5 → (500+250)/1000=75%, 1.0 → (500+500)/1000=100%
            expect(onProgress).toHaveBeenCalledTimes(4);
            expect(onProgress).toHaveBeenNthCalledWith(1, 25);
            expect(onProgress).toHaveBeenNthCalledWith(2, 50);
            expect(onProgress).toHaveBeenNthCalledWith(3, 75);
            expect(onProgress).toHaveBeenNthCalledWith(4, 100);
        });
    });

    describe('cancel', () => {
        it('should return false when not in downloading state', () => {
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            expect(executor.cancel()).toBe(false);
        });
    });

    describe('createCompleted', () => {
        it('should return an executor with Completed state and 100 progress', () => {
            const config = makeConfig();
            const executor = DownloadTaskExecutor.createCompleted(
                'test_capability',
                config,
                mockLogger,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
                { verify: mockVerify } as any,
            );

            expect(executor.getState()).toBe(DownloadState.Completed);
            expect(executor.getProgress()).toBe(100);
        });
    });
});
