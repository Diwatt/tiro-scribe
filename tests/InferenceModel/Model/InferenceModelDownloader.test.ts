/**
 * Downloader tests — contract focused.
 * Tests public API surface: method signatures, return types, error contracts,
 * and zombie edge cases that could break the contract.
 *
 * NOTE: Tests are agnostic about internal implementation. We test behavior
 * through the public API only, using mocks at the dependency boundary.
 */

import type { ModelConfig } from '@/Api';
import type { AppLogger } from '@/Core/AppLogger';
import { Downloader } from '@/InferenceModel/Downloader';
import { DownloadTaskExecutor } from '@/InferenceModel/Download/DownloadTaskExecutor';
import { DownloadTaskManager } from '@/InferenceModel/Download/DownloadTaskManager';
import { ModelArtifactStorage } from '@/InferenceModel/Download/ModelArtifactStorage';
import { DownloadState } from '@/InferenceModel/Download/Type';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('expo-file-system', () => ({}));
jest.mock('@/Repository/DownloadQueueRepository', () => ({ DownloadQueueRepository: jest.fn() }));
jest.mock('@/InferenceModel/Download/DownloadTaskManager', () => ({ DownloadTaskManager: jest.fn() }));
jest.mock('@/InferenceModel/Download/ModelArtifactStorage', () => ({ ModelArtifactStorage: jest.fn() }));
jest.mock('@/InferenceModel/Download/ChecksumVerifier', () => ({ ChecksumVerifier: jest.fn() }));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const speakerConfig: ModelConfig = {
    capability: 'speaker_id',
    id: 'speaker-v1',
    version: '1.0.0',
    files: [{ url: 'https://example.com/speaker.onnx', hash: 'abc123', sizeBytes: 1024 * 1024 }],
    minAppVersion: '1.0.0',
};

const vadConfig: ModelConfig = {
    capability: 'vad',
    id: 'vad-v1',
    version: '1.0.0',
    files: [{ url: 'https://example.com/vad.onnx', hash: 'def456', sizeBytes: 512 * 1024 }],
    minAppVersion: '1.0.0',
};

const createMockLogger = (): AppLogger =>
    ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }) as unknown as AppLogger;

const createMockTaskManager = (overrides: Partial<jest.Mocked<DownloadTaskManager>> = {}) =>
    ({
        add: jest.fn(),
        getActiveSession: jest.fn(),
        getActiveSessions: jest.fn().mockReturnValue([]),
        getOrCreateExecutor: jest.fn(),
        removeSession: jest.fn(),
        getByCapability: jest.fn(),
        ...overrides,
    } as unknown as jest.Mocked<DownloadTaskManager>);

const createMockArtifactStorage = (overrides: Partial<jest.Mocked<ModelArtifactStorage>> = {}) =>
    ({
        hasAllFiles: jest.fn(),
        getUri: jest.fn(),
        toAbsoluteUri: jest.fn((uri: string) => uri),
        getModelUri: jest.fn(),
        ...overrides,
    } as unknown as jest.Mocked<ModelArtifactStorage>);

const createMockConfigProvider = (overrides: Partial<jest.Mocked<Record<string, jest.Func>>> = {}) =>
    ({
        getConfig: jest.fn(),
        getConfigs: jest.fn(),
        getTotalSize: jest.fn(),
        ...overrides,
    } as unknown as jest.Mocked<Record<string, jest.Func>>);

const createFakeExecutor = (overrides: Partial<DownloadTaskExecutor> = {}): DownloadTaskExecutor =>
    ({
        config: speakerConfig,
        getState: () => DownloadState.Completed,
        getProgress: () => 100,
        start: jest.fn().mockResolvedValue(undefined),
        getModelUri: () => 'file://models/speaker_id/speaker-v1',
        ...overrides,
    } as unknown as DownloadTaskExecutor);

// ---------------------------------------------------------------------------
// CONTRACT: download(capability, localization?) → Promise<DownloadTaskExecutor>
// ---------------------------------------------------------------------------
describe('Downloader', () => {
    describe('download', () => {
        it('should return DownloadTaskExecutor when already downloaded', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage({ hasAllFiles: jest.fn().mockReturnValue(true) });
            const mockConfigProvider = createMockConfigProvider({ getConfig: jest.fn().mockResolvedValue(speakerConfig) });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const executor = await downloader.download('speaker_id');

            expect(executor).toBeInstanceOf(DownloadTaskExecutor);
            expect(mockConfigProvider.getConfig).toHaveBeenCalledWith('speaker_id', undefined);
            expect(mockStorage.hasAllFiles).toHaveBeenCalledWith(speakerConfig);
        });

        it('should pass localization to getConfig when provided', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage({ hasAllFiles: jest.fn().mockReturnValue(true) });
            const mockConfigProvider = createMockConfigProvider({ getConfig: jest.fn().mockResolvedValue(speakerConfig) });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await downloader.download('speaker_id', 'fr');

            expect(mockConfigProvider.getConfig).toHaveBeenCalledWith('speaker_id', 'fr');
        });

        it('should create executor when model not downloaded', async () => {
            const fakeExecutor = createFakeExecutor();
            const mockTaskManager = createMockTaskManager({
                add: jest.fn().mockResolvedValue({ id: 'task-1' }),
                getOrCreateExecutor: jest.fn().mockReturnValue(fakeExecutor),
            });
            const mockStorage = createMockArtifactStorage({ hasAllFiles: jest.fn().mockReturnValue(false) });
            const mockConfigProvider = createMockConfigProvider({ getConfig: jest.fn().mockResolvedValue(speakerConfig) });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const executor = await downloader.download('speaker_id');

            expect(mockTaskManager.add).toHaveBeenCalledWith('speaker_id', undefined);
            expect(mockTaskManager.getOrCreateExecutor).toHaveBeenCalled();
            expect(executor).toBe(fakeExecutor);
        });

        it('should call start on executor', async () => {
            const fakeExecutor = createFakeExecutor({ start: jest.fn().mockResolvedValue(undefined) });
            const mockTaskManager = createMockTaskManager({
                add: jest.fn().mockResolvedValue({ id: 'task-1' }),
                getOrCreateExecutor: jest.fn().mockReturnValue(fakeExecutor),
            });
            const mockStorage = createMockArtifactStorage({ hasAllFiles: jest.fn().mockReturnValue(false) });
            const mockConfigProvider = createMockConfigProvider({ getConfig: jest.fn().mockResolvedValue(speakerConfig) });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await downloader.download('speaker_id');

            expect(fakeExecutor.start).toHaveBeenCalled();
        });

        it('should reject when getConfig throws', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockRejectedValue(new Error('Config not found')),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await expect(downloader.download('speaker_id')).rejects.toThrow('Config not found');
        });
    });

    // -------------------------------------------------------------------------
    // CONTRACT: getConfig(key, appLanguage?) → Promise<ModelConfig>
    // -------------------------------------------------------------------------
    describe('getConfig', () => {
        it('should return config from provider', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockResolvedValue(speakerConfig),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const result = await downloader.getConfig('speaker_id');

            expect(result).toEqual(speakerConfig);
            expect(mockConfigProvider.getConfig).toHaveBeenCalledWith('speaker_id', undefined);
        });

        it('should pass language to provider', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockResolvedValue(speakerConfig),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await downloader.getConfig('speaker_id', 'de');

            expect(mockConfigProvider.getConfig).toHaveBeenCalledWith('speaker_id', 'de');
        });

        it('should propagate provider errors', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockRejectedValue(new Error('Provider error')),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await expect(downloader.getConfig('speaker_id')).rejects.toThrow('Provider error');
        });
    });

    // -------------------------------------------------------------------------
    // CONTRACT: getConfigs(appLanguage?) → Promise<Record<string, ModelConfig>>
    // -------------------------------------------------------------------------
    describe('getConfigs', () => {
        it('should return configs from provider', async () => {
            const configs = { speaker_id: speakerConfig, vad: vadConfig };
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfigs: jest.fn().mockResolvedValue(configs),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const result = await downloader.getConfigs();

            expect(result).toEqual(configs);
            expect(mockConfigProvider.getConfigs).toHaveBeenCalledWith(undefined);
        });

        it('should pass language to provider', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfigs: jest.fn().mockResolvedValue({}),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await downloader.getConfigs('it');

            expect(mockConfigProvider.getConfigs).toHaveBeenCalledWith('it');
        });
    });

    // -------------------------------------------------------------------------
    // CONTRACT: getLocalPath(capability, version?) → string | undefined
    // -------------------------------------------------------------------------
    describe('getLocalPath', () => {
        it('should return path when session exists', async () => {
            const mockSession = { config: speakerConfig, capability: 'speaker_id' };
            const mockTaskManager = createMockTaskManager({
                getActiveSession: jest.fn().mockReturnValue(mockSession),
            });
            const mockStorage = createMockArtifactStorage({
                getUri: jest.fn().mockReturnValue('file://models/speaker_id/speaker-v1'),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                createMockConfigProvider() as Parameters<typeof Downloader>[3],
            );

            const path = await downloader.getLocalPath('speaker_id');

            expect(path).toBe('file://models/speaker_id/speaker-v1');
            expect(mockTaskManager.getActiveSession).toHaveBeenCalledWith('speaker_id');
        });

        it('should return undefined when no session exists', async () => {
            const mockTaskManager = createMockTaskManager({
                getActiveSession: jest.fn().mockReturnValue(undefined),
            });
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockResolvedValue(speakerConfig),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const path = await downloader.getLocalPath('speaker_id');
            expect(path).toBeUndefined();
        });

        it('should return undefined when config has no files', async () => {
            const emptyConfig = { ...speakerConfig, files: [] };
            const mockSession = { config: emptyConfig, capability: 'speaker_id' };
            const mockTaskManager = createMockTaskManager({
                getActiveSession: jest.fn().mockReturnValue(mockSession),
            });
            const mockStorage = createMockArtifactStorage({
                getUri: jest.fn().mockReturnValue('file://models/speaker_id/speaker-v1'),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                createMockConfigProvider() as Parameters<typeof Downloader>[3],
            );

            const path = await downloader.getLocalPath('speaker_id');
            expect(path).toBeUndefined();
        });

        it('should return absolute uri from artifact storage', async () => {
            const mockSession = { config: speakerConfig, capability: 'speaker_id' };
            const mockTaskManager = createMockTaskManager({
                getActiveSession: jest.fn().mockReturnValue(mockSession),
            });
            const mockStorage = createMockArtifactStorage({
                getUri: jest.fn().mockReturnValue('file://models/speaker_id/speaker-v1'),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                createMockConfigProvider() as Parameters<typeof Downloader>[3],
            );

            const path = await downloader.getLocalPath('speaker_id');
            expect(path).toBe('file://models/speaker_id/speaker-v1');
        });

        it('should accept version parameter without throwing', async () => {
            const mockSession = { config: speakerConfig, capability: 'speaker_id' };
            const mockTaskManager = createMockTaskManager({
                getActiveSession: jest.fn().mockReturnValue(mockSession),
            });
            const mockStorage = createMockArtifactStorage({
                getUri: jest.fn().mockReturnValue('file://models/speaker_id/speaker-v1'),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                createMockConfigProvider() as Parameters<typeof Downloader>[3],
            );

            const path = await downloader.getLocalPath('speaker_id', '1.0.0');
            expect(path).toBe('file://models/speaker_id/speaker-v1');
        });
    });

    // -------------------------------------------------------------------------
    // CONTRACT: getTotalSize(appLanguage?) → Promise<number>
    // -------------------------------------------------------------------------
    describe('getTotalSize', () => {
        it('should return total size from provider', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getTotalSize: jest.fn().mockResolvedValue(1024 * 1024 * 100),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const size = await downloader.getTotalSize();
            expect(size).toBe(1024 * 1024 * 100);
            expect(mockConfigProvider.getTotalSize).toHaveBeenCalledWith(undefined);
        });

        it('should pass language to provider', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getTotalSize: jest.fn().mockResolvedValue(0),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await downloader.getTotalSize('es');
            expect(mockConfigProvider.getTotalSize).toHaveBeenCalledWith('es');
        });

        it('should propagate provider errors', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getTotalSize: jest.fn().mockRejectedValue(new Error('Provider error')),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            await expect(downloader.getTotalSize()).rejects.toThrow('Provider error');
        });
    });

    // -------------------------------------------------------------------------
    // ZOMBIE: edge cases that should not break the contract
    // -------------------------------------------------------------------------
    describe('zombie edge cases', () => {
        it('should handle getConfig returning null', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockResolvedValue(null),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const config = await downloader.getConfig('speaker_id');
            expect(config).toBeNull();
        });

        it('should handle getConfig returning undefined', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockResolvedValue(undefined),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const config = await downloader.getConfig('speaker_id');
            expect(config).toBeUndefined();
        });

        it('should handle getConfigs returning null', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfigs: jest.fn().mockResolvedValue(null as unknown as Record<string, ModelConfig>),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const configs = await downloader.getConfigs();
            expect(configs).toBeNull();
        });

        it('should handle getLocalPath with empty capability string', async () => {
            const mockTaskManager = createMockTaskManager({
                getActiveSession: jest.fn().mockReturnValue(undefined),
            });
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getConfig: jest.fn().mockResolvedValue(speakerConfig),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const path = await downloader.getLocalPath('');
            expect(path).toBeUndefined();
        });

        it('should handle getTotalSize returning NaN', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getTotalSize: jest.fn().mockResolvedValue(NaN),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const size = await downloader.getTotalSize();
            expect(size).toBeNaN();
        });

        it('should handle getTotalSize returning negative number', async () => {
            const mockTaskManager = createMockTaskManager();
            const mockStorage = createMockArtifactStorage();
            const mockConfigProvider = createMockConfigProvider({
                getTotalSize: jest.fn().mockResolvedValue(-100),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const size = await downloader.getTotalSize();
            expect(size).toBe(-100);
        });

        it('should handle artifact storage getUri returning absolute path', async () => {
            const mockSession = { config: speakerConfig, capability: 'speaker_id' };
            const mockTaskManager = createMockTaskManager({
                getActiveSession: jest.fn().mockReturnValue(mockSession),
            });
            const mockStorage = createMockArtifactStorage({
                getUri: jest.fn().mockReturnValue('/absolute/path/to/model.onnx'),
            });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                createMockConfigProvider() as Parameters<typeof Downloader>[3],
            );

            const path = await downloader.getLocalPath('speaker_id');
            expect(path).toBe('/absolute/path/to/model.onnx');
        });

        it('should handle download executor rejecting without breaking', async () => {
            const failingExecutor = createFakeExecutor({
                start: jest.fn().mockRejectedValue(new Error('Executor failed')),
            });
            const mockTaskManager = createMockTaskManager({
                add: jest.fn().mockResolvedValue({ id: 'task-1' }),
                getOrCreateExecutor: jest.fn().mockReturnValue(failingExecutor),
            });
            const mockStorage = createMockArtifactStorage({ hasAllFiles: jest.fn().mockReturnValue(false) });
            const mockConfigProvider = createMockConfigProvider({ getConfig: jest.fn().mockResolvedValue(speakerConfig) });

            const downloader = new Downloader(
                createMockLogger(),
                mockStorage,
                mockTaskManager,
                mockConfigProvider as Parameters<typeof Downloader>[3],
            );

            const executor = await downloader.download('speaker_id');
            expect(executor).toBe(failingExecutor);
        });
    });
});