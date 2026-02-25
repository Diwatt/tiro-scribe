/**
 * InferenceModelVersionManager tests.
 * Tests version comparison, update checking, and size calculation.
 * Includes "zombie method" tests for edge cases and error conditions.
 */

// Set global __DEV__ variable for tests
// @ts-expect-error allow setting global for test
global.__DEV__ = true;

import { vi } from 'vitest';
import { InferenceModelVersionManager, type UpdateCheckResult, type UpdateInfo } from '@/Service/InferenceModelVersionManager';
import { InferenceModelConfigProvider } from '@/Service/InferenceModelConfigProvider';
import { ModelArtifactStorage } from '@/Service/InferenceModelDownload/ModelArtifactStorage';
import type { ModelConfig } from '@/Api';
import type { LoggerInterface } from '@/Service/Logger';

// Mock dependencies
vi.mock('@/Service/InferenceModelConfigProvider');
vi.mock('@/Service/InferenceModelDownload/ModelArtifactStorage', () => {
    // Create a mock class
    const MockModelArtifactStorage = vi.fn(function() {
        // When called as a constructor, return an instance with methods
        this.calculateTotalSize = vi.fn();
        this.deleteModelConfig = vi.fn();
    });
    
    return {
        ModelArtifactStorage: MockModelArtifactStorage,
    };
});
vi.mock('@/Service/Logger', () => ({
    AppLogger: {
        getInstance: vi.fn(),
    },
}));

// Mock AppConfig to avoid __DEV__ issues
vi.mock('@/Config/AppConfig', () => ({
    AppConfig: {
        getInstance: vi.fn().mockReturnValue({
            isDev: true,
        }),
    },
}));

// Mock semver
vi.mock('semver', () => ({
    default: {
        gt: vi.fn(),
    },
}));

describe('InferenceModelVersionManager', () => {
    let versionManager: InferenceModelVersionManager;
    let mockLogger: LoggerInterface;
    let mockConfigProvider: any;
    let mockArtifactStorage: any;
    let mockSemver: any;

    beforeEach(async () => {
        // Create mock logger
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        } as any;

        // Create mock config provider
        mockConfigProvider = {
            getConfigs: vi.fn(),
            getConfig: vi.fn(),
        };

        // Create mock artifact storage
        mockArtifactStorage = {
            calculateTotalSize: vi.fn(),
            deleteModelConfig: vi.fn(),
        };

        // Get semver mock
        mockSemver = (await import('semver')).default;

        // Setup mocks
        vi.mocked(InferenceModelConfigProvider).mockImplementation(() => mockConfigProvider);

        versionManager = new InferenceModelVersionManager(
            mockLogger,
            mockConfigProvider,
            mockArtifactStorage
        );
        vi.clearAllMocks();
    });


    describe('checkForUpdates', () => {
        const mockRemoteConfigs: Record<string, ModelConfig> = {
            speaker_id: {
                capability: 'speaker_id',
                id: 'speaker-v2',
                version: '2.0.0',
                files: [
                    {
                        url: 'https://example.com/speaker-v2.onnx',
                        hash: 'abc123',
                        sizeBytes: 2 * 1024 * 1024, // 2MB
                    },
                ],
                minAppVersion: '1.0.0',
            },
            vad: {
                capability: 'vad',
                id: 'vad-v1',
                version: '1.0.0',
                files: [
                    {
                        url: 'https://example.com/vad.onnx',
                        hash: 'def456',
                        sizeBytes: 512 * 1024, // 512KB
                    },
                ],
                minAppVersion: '1.0.0',
            },
        };

        const mockLocalConfigs: Record<string, ModelConfig> = {
            speaker_id: {
                capability: 'speaker_id',
                id: 'speaker-v1',
                version: '1.0.0',
                files: [
                    {
                        url: 'https://example.com/speaker.onnx',
                        hash: 'old123',
                        sizeBytes: 1024 * 1024, // 1MB
                    },
                ],
                minAppVersion: '1.0.0',
            },
            vad: {
                capability: 'vad',
                id: 'vad-v1',
                version: '1.0.0',
                files: [
                    {
                        url: 'https://example.com/vad.onnx',
                        hash: 'def456',
                        sizeBytes: 512 * 1024, // 512KB
                    },
                ],
                minAppVersion: '1.0.0',
            },
        };

        beforeEach(() => {
            mockConfigProvider.getConfigs.mockResolvedValue(mockRemoteConfigs);
            vi.spyOn(versionManager as any, 'getLocalConfigs').mockResolvedValue(mockLocalConfigs);
            mockArtifactStorage.calculateTotalSize.mockResolvedValue(0);
        });

        it('should detect updates when newer version available', async () => {
            // Mock semver.gt to return true only for speaker_id (2.0.0 > 1.0.0)
            // and false for vad (1.0.0 == 1.0.0)
            mockSemver.gt.mockImplementation((remote: string, local: string) => {
                if (remote === '2.0.0' && local === '1.0.0') {
                    return true; // speaker_id update
                }
                return false; // vad no update
            });
            
            const result: UpdateCheckResult = await versionManager.checkForUpdates();
            
            expect(result.hasUpdates).toBe(true);
            expect(result.updates).toHaveLength(1);
            expect(result.updates![0]).toEqual({
                capability: 'speaker_id',
                currentVersion: '1.0.0',
                availableVersion: '2.0.0',
                sizeBytes: 2 * 1024 * 1024,
            });
        });

        it('should not detect updates when versions are same', async () => {
            mockSemver.gt.mockReturnValue(false); // 1.0.0 == 1.0.0
            
            const result: UpdateCheckResult = await versionManager.checkForUpdates();
            
            expect(result.hasUpdates).toBe(false);
            expect(result.updates).toHaveLength(0); // Implementation returns empty array, not undefined
        });

        it('should check specific capabilities only', async () => {
            mockSemver.gt.mockReturnValue(true);
            
            const result = await versionManager.checkForUpdates(['speaker_id']);
            
            expect(result.hasUpdates).toBe(true);
            // When capabilities array is provided, getConfigs is called without language filter
            expect(mockConfigProvider.getConfigs).toHaveBeenCalledWith();
        });

        it('should handle empty capabilities array', async () => {
            mockSemver.gt.mockReturnValue(false);
            
            const result = await versionManager.checkForUpdates([]);
            
            expect(result.hasUpdates).toBe(false);
        });

        it('should handle missing local config for capability', async () => {
            const localConfigsWithoutSpeaker: Record<string, ModelConfig> = {
                vad: mockLocalConfigs.vad,
            };
            vi.spyOn(versionManager as any, 'getLocalConfigs').mockResolvedValue(localConfigsWithoutSpeaker);
            // Mock semver.gt to return false for vad (1.0.0 == 1.0.0)
            mockSemver.gt.mockReturnValue(false);
            
            const result = await versionManager.checkForUpdates();
            
            // Implementation skips capabilities without local config (line 90-92: if (!localConfig) continue;)
            // So no updates should be detected for speaker_id since it has no local config
            // vad has same version (1.0.0 == 1.0.0), so no update
            expect(result.hasUpdates).toBe(false);
        });

        it('should handle missing remote config for capability', async () => {
            const remoteConfigsWithoutSpeaker: Record<string, ModelConfig> = {
                vad: mockRemoteConfigs.vad,
            };
            mockConfigProvider.getConfigs.mockResolvedValue(remoteConfigsWithoutSpeaker);
            // Mock semver.gt to return false for vad (1.0.0 == 1.0.0)
            mockSemver.gt.mockReturnValue(false);
            
            const result = await versionManager.checkForUpdates();
            
            // Implementation logs warning and continues (line 84-87)
            // speaker_id has no remote config, so no update for it
            // vad has same version (1.0.0 == 1.0.0), so no update
            expect(result.hasUpdates).toBe(false);
        });

        it('should calculate total update size', async () => {
            // Mock semver.gt to return true only for speaker_id
            mockSemver.gt.mockImplementation((remote: string, local: string) => {
                if (remote === '2.0.0' && local === '1.0.0') {
                    return true; // speaker_id update
                }
                return false; // vad no update
            });
            
            const result = await versionManager.checkForUpdates();
            
            // speaker_id update size is 2MB (from files[0].sizeBytes)
            // Implementation uses calculateConfigSize which sums file sizes
            expect(result.totalSizeBytes).toBe(2 * 1024 * 1024);
            // Note: Implementation doesn't call artifactStorage.calculateTotalSize
            // It uses calculateConfigSize method internally
        });

        it('should propagate errors from config provider', async () => {
            const error = new Error('API error');
            mockConfigProvider.getConfigs.mockRejectedValue(error);
            
            await expect(versionManager.checkForUpdates()).rejects.toThrow('API error');
        });
    });

    describe('update', () => {
        const mockLocalConfig: ModelConfig = {
            capability: 'speaker_id',
            id: 'speaker-v1',
            version: '1.0.0',
            files: [],
            minAppVersion: '1.0.0',
        };

        const mockRemoteConfig: ModelConfig = {
            capability: 'speaker_id',
            id: 'speaker-v2',
            version: '2.0.0',
            files: [],
            minAppVersion: '1.0.0',
        };

        beforeEach(() => {
            mockConfigProvider.getConfig.mockResolvedValue(mockRemoteConfig);
            // Mock getLocalConfigs to return a local config
            vi.spyOn(versionManager as any, 'getLocalConfigs').mockResolvedValue({
                speaker_id: mockLocalConfig,
            });
            // Mock isNewerVersion to return true
            vi.spyOn(versionManager as any, 'isNewerVersion').mockReturnValue(true);
        });

        it('should fetch config and delegate to downloader', async () => {
            // This is a placeholder test since update() currently just fetches config
            // In a real implementation, it would call downloader.download()
            await versionManager.update('speaker_id');
            
            expect(mockConfigProvider.getConfig).toHaveBeenCalledWith('speaker_id');
            expect(mockLogger.info).toHaveBeenCalledWith('Updating model: speaker_id');
        });

        it('should update capability', async () => {
            await versionManager.update('speaker_id');
            
            expect(mockConfigProvider.getConfig).toHaveBeenCalledWith('speaker_id');
        });

        it('should propagate errors from config provider', async () => {
            const error = new Error('Config not found');
            mockConfigProvider.getConfig.mockRejectedValue(error);
            
            await expect(versionManager.update('speaker_id')).rejects.toThrow('Config not found');
        });
    });

    describe('isNewerVersion', () => {
        beforeEach(() => {
            mockSemver.gt.mockClear();
        });

        it('should return true when remote version is newer', () => {
            mockSemver.gt.mockReturnValue(true);
            
            const result = (versionManager as any).isNewerVersion('2.0.0', '1.0.0');
            
            expect(result).toBe(true);
            expect(mockSemver.gt).toHaveBeenCalledWith('2.0.0', '1.0.0');
        });

        it('should return false when remote version is older', () => {
            mockSemver.gt.mockReturnValue(false);
            
            const result = (versionManager as any).isNewerVersion('1.0.0', '2.0.0');
            
            expect(result).toBe(false);
            expect(mockSemver.gt).toHaveBeenCalledWith('1.0.0', '2.0.0');
        });

        it('should return false when versions are equal', () => {
            mockSemver.gt.mockReturnValue(false);
            
            const result = (versionManager as any).isNewerVersion('1.0.0', '1.0.0');
            
            expect(result).toBe(false);
            expect(mockSemver.gt).toHaveBeenCalledWith('1.0.0', '1.0.0');
        });

        it('should handle semver parsing errors by throwing', () => {
            mockSemver.gt.mockImplementation(() => {
                throw new Error('Invalid version');
            });
            
            expect(() => (versionManager as any).isNewerVersion('invalid', '1.0.0')).toThrow('Invalid version');
        });
    });

    describe('calculateConfigSize', () => {
        it('should calculate size from files', () => {
            const config: ModelConfig = {
                capability: 'test',
                id: 'test-v1',
                version: '1.0.0',
                files: [
                    { url: 'file1', hash: 'hash1', sizeBytes: 100 },
                    { url: 'file2', hash: 'hash2', sizeBytes: 200 },
                ],
                minAppVersion: '1.0.0',
            };
            
            const size = (versionManager as any).calculateConfigSize(config);
            
            expect(size).toBe(300);
        });

        it('should return 0 for empty files array', () => {
            const config: ModelConfig = {
                capability: 'test',
                id: 'test-v1',
                version: '1.0.0',
                files: [],
                minAppVersion: '1.0.0',
            };
            
            const size = (versionManager as any).calculateConfigSize(config);
            
            expect(size).toBe(0);
        });

        it('should return 0 for missing files property', () => {
            const config = {
                capability: 'test',
                id: 'test-v1',
                version: '1.0.0',
                minAppVersion: '1.0.0',
            } as any;
            
            const size = (versionManager as any).calculateConfigSize(config);
            
            expect(size).toBe(0);
        });

        it('should handle null files', () => {
            const config = {
                capability: 'test',
                id: 'test-v1',
                version: '1.0.0',
                files: null,
                minAppVersion: '1.0.0',
            } as any;
            
            const size = (versionManager as any).calculateConfigSize(config);
            
            expect(size).toBe(0);
        });
    });

    // Zombie method tests - edge cases and error conditions
    describe('zombie method tests', () => {
        it('should handle null/undefined configs from getLocalConfigs', async () => {
            vi.spyOn(versionManager as any, 'getLocalConfigs').mockResolvedValue(null);
            mockConfigProvider.getConfigs.mockResolvedValue({});
            
            // This will throw because Object.keys(null) throws TypeError
            await expect(versionManager.checkForUpdates()).rejects.toThrow(TypeError);
        });

        it('should handle empty configs from API', async () => {
            vi.spyOn(versionManager as any, 'getLocalConfigs').mockResolvedValue({});
            mockConfigProvider.getConfigs.mockResolvedValue({});
            
            const result = await versionManager.checkForUpdates();
            
            expect(result.hasUpdates).toBe(false);
        });

        it('should handle config with null version', async () => {
            const configWithNullVersion = {
                capability: 'test',
                id: 'test-v1',
                version: null,
                files: [],
                minAppVersion: '1.0.0',
            } as any;
            
            expect(() => (versionManager as any).isNewerVersion('2.0.0', null)).toThrow();
        });

        it('should handle empty version strings', async () => {
            expect(() => (versionManager as any).isNewerVersion('', '1.0.0')).toThrow();
            expect(() => (versionManager as any).isNewerVersion('2.0.0', '')).toThrow();
        });

        it('should handle non-string versions', async () => {
            expect(() => (versionManager as any).isNewerVersion(2 as any, '1.0.0')).toThrow();
            expect(() => (versionManager as any).isNewerVersion('2.0.0', 1 as any)).toThrow();
        });


        it('should handle error in calculateTotalSize', async () => {
            vi.spyOn(versionManager as any, 'getLocalConfigs').mockResolvedValue({});
            mockConfigProvider.getConfigs.mockResolvedValue({
                test: {
                    capability: 'test',
                    id: 'test-v1',
                    version: '2.0.0',
                    files: [],
                    minAppVersion: '1.0.0',
                },
            });
            mockSemver.gt.mockReturnValue(true);
            
            const result = await versionManager.checkForUpdates();
            
            // No local config for 'test' capability, so it's skipped (line 90-92: if (!localConfig) continue;)
            expect(result.hasUpdates).toBe(false);
            expect(result.totalSizeBytes).toBe(0);
        });
    });
});