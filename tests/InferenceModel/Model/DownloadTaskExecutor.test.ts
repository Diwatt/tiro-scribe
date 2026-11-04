/**
 * DownloadTaskExecutor tests.
 *
 * Tests the download task execution with a module-mocked FileDownloader
 * (Promise-based) and constructor-injected fakes for ChecksumVerifier and
 * ModelArtifactStorage. Verifies per-file progress reaches 100%, overall
 * progress calculation for multiple files, correct lifecycle state
 * transitions, and the cancellation path.
 */

import type { InferenceModelFile, ModelConfig } from '@/Api';
import { InferenceModelDownloaderException } from '@/Exception';
import { DownloadQueue, DownloadQueueStatus } from '@/Entity';
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

const makeQueueEntity = (status: DownloadQueueStatus = DownloadQueueStatus.Pending): DownloadQueue => {
    const entity = new DownloadQueue();
    entity.uuid = 'queue-test-uuid';
    entity.capability = 'test_capability';
    entity.status = status;
    entity.progressPercent = status === DownloadQueueStatus.Completed ? 100 : 0;
    entity.errorMessage = '';
    return entity;
};

const waitForExecutorState = async (
    executor: DownloadTaskExecutor,
    expected: DownloadState,
): Promise<void> => {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (executor.getState() === expected) {
            return;
        }
        await Promise.resolve();
    }
    throw new Error(`Executor did not reach state "${expected}" (current: "${executor.getState()}")`);
};

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
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );
            const dispose = executor.progress$.onChange(({ value }) => {
                if (value !== progressValues[progressValues.length - 1]) {
                    progressValues.push(value);
                }
            });

            await executor.start();
            dispose();

            // Each file's downloader fires chunk progress 0.5 then 1
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
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );
            const dispose = executor.currentFileName$.onChange(({ value }) => {
                if (value) {
                    fileNames.push(value);
                }
            });

            await executor.start();
            dispose();

            expect(fileNames).toEqual(['alpha.bin', 'bravo.bin']);
        });

        it('should emit Pending, Downloading then Completed when a pending download succeeds', async () => {
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(DownloadQueueStatus.Pending),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            const observedStates: DownloadState[] = [];
            const dispose = executor.state$.onChange(
                ({ value }) => observedStates.push(value),
                { initial: true },
            );

            await executor.start();
            dispose();

            expect(observedStates).toEqual([
                DownloadState.Pending,
                DownloadState.Downloading,
                DownloadState.Completed,
            ]);
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
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );
            const dispose = executor.currentFileProgress$.onChange(({ value }) => {
                if (value !== fileProgressValues[fileProgressValues.length - 1]) {
                    fileProgressValues.push(value);
                }
            });

            await executor.start();
            dispose();

            // Mock fires chunk progress 0.5 → 50%, then 1 → 100%
            expect(fileProgressValues).toEqual([50, 100]);
        });
    });

    describe('cancel', () => {
        it('should return false when not in downloading state', () => {
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(DownloadQueueStatus.Completed),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            expect(executor.cancel()).toBe(false);
        });

        it('should cancel an in-progress download with a cancellation error', async () => {
            mockDownload.mockImplementationOnce(() => new Promise<void>(() => {}));
            const config = makeConfig([makeFile()]);
            const executor = new DownloadTaskExecutor(
                mockLogger,
                makeQueueEntity(DownloadQueueStatus.Pending),
                config,
                { verify: mockVerify } as any,
                { getFile: mockGetFile, ensureDirectories: mockEnsureDirectories } as any,
            );

            const startPromise = executor.start();
            startPromise.catch(() => {});
            await waitForExecutorState(executor, DownloadState.Downloading);

            const wasCancelled = executor.cancel();

            expect(wasCancelled).toBe(true);
            expect(executor.getState()).toBe(DownloadState.Cancelled);
            expect(executor.getError()).toBe('Download cancelled by user');
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
            expect(executor.progress$.get()).toBe(100);
        });
    });
});
