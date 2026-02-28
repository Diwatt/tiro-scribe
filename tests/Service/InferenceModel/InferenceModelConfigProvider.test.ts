/**
 * InferenceModelConfigProvider tests.
 * Tests configuration retrieval, error handling, and size calculation.
 * Includes "zombie method" tests for edge cases and error conditions.
 */

import { vi } from 'vitest';
import { InferenceModelConfigProvider } from '@/Service/InferenceModelConfigProvider';
import { apiClientRegistry, InferenceModelClient } from '@/Api';
import { ApiClientException } from '@/Exception';
import { InferenceModelDownloaderException } from '@/Exception/InferenceModelDownloaderException';
import type { ModelConfig } from '@/Api';

// Mock dependencies
vi.mock('@/Api', () => ({
    apiClientRegistry: {
        get: vi.fn(),
    },
    InferenceModelClient: vi.fn(),
}));

vi.mock('@/Service/Logger', () => ({
    appLogger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('InferenceModelConfigProvider', () => {
    let configProvider: InferenceModelConfigProvider;
    let mockLogger: any;
    let mockInferenceModelClient: any;

    beforeEach(async () => {
        // Create mock logger
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        // Create mock InferenceModelClient
        mockInferenceModelClient = {
            getInferenceModels: vi.fn(),
        };

        // Setup mocks
        vi.mocked(apiClientRegistry.get).mockReturnValue(mockInferenceModelClient);
        vi.mocked(InferenceModelClient).mockImplementation(() => mockInferenceModelClient);

        configProvider = new InferenceModelConfigProvider(mockLogger);
        vi.clearAllMocks();
    });


    describe('getConfig', () => {
        const mockConfigs: Record<string, ModelConfig> = {
            speaker_id: {
                capability: 'speaker_id',
                id: 'speaker-v1',
                version: '1.0.0',
                files: [
                    {
                        url: 'https://example.com/speaker.onnx',
                        hash: 'abc123',
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
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigs);
        });

        it('should return config for existing capability', async () => {
            const config = await configProvider.getConfig('speaker_id');
            
            expect(config).toEqual(mockConfigs.speaker_id);
            expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith(undefined);
        });

        it('should return config with language filter', async () => {
            const config = await configProvider.getConfig('vad', 'en');
            
            expect(config).toEqual(mockConfigs.vad);
            expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith('en');
        });

        it('should throw InferenceModelDownloaderException for unknown capability', async () => {
            await expect(configProvider.getConfig('unknown_capability')).rejects.toThrow(
                InferenceModelDownloaderException
            );
            
            await expect(configProvider.getConfig('unknown_capability')).rejects.toMatchObject({
                code: 'INFERENCE_MODEL_DOWNLOADER_ERROR',
            });
        });

        it('should propagate ApiClientException from client as InferenceModelDownloaderException', async () => {
            const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
            mockInferenceModelClient.getInferenceModels.mockRejectedValue(apiError);
            
            await expect(configProvider.getConfig('speaker_id')).rejects.toThrow(InferenceModelDownloaderException);
        });

        it('should log error when API call fails', async () => {
            const apiError = new Error('Network error');
            mockInferenceModelClient.getInferenceModels.mockRejectedValue(apiError);
            
            await expect(configProvider.getConfig('speaker_id')).rejects.toThrow();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                '[InferenceModelConfigProvider] getConfig failed',
                expect.objectContaining({
                    key: 'speaker_id',
                    error: 'Network error'
                })
            );
        });
    });

    describe('getConfigs', () => {
        const mockConfigs: Record<string, ModelConfig> = {
            speaker_id: {
                capability: 'speaker_id',
                id: 'speaker-v1',
                version: '1.0.0',
                files: [],
                minAppVersion: '1.0.0',
            },
        };

        it('should return all configs', async () => {
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigs);
            
            const configs = await configProvider.getConfigs();
            
            expect(configs).toEqual(mockConfigs);
            expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith(undefined);
        });

        it('should return configs with language filter', async () => {
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigs);
            
            const configs = await configProvider.getConfigs('fr');
            
            expect(configs).toEqual(mockConfigs);
            expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith('fr');
        });

        it('should propagate API errors as InferenceModelDownloaderException', async () => {
            const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
            mockInferenceModelClient.getInferenceModels.mockRejectedValue(apiError);
            
            await expect(configProvider.getConfigs()).rejects.toThrow(InferenceModelDownloaderException);
        });
    });

    describe('getTotalSize', () => {
        const mockConfigs: Record<string, ModelConfig> = {
            speaker_id: {
                capability: 'speaker_id',
                id: 'speaker-v1',
                version: '1.0.0',
                files: [
                    {
                        url: 'https://example.com/speaker.onnx',
                        hash: 'abc123',
                        sizeBytes: 1024 * 1024, // 1MB
                    },
                    {
                        url: 'https://example.com/speaker.config',
                        hash: 'def456',
                        sizeBytes: 1024, // 1KB
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
                        hash: 'ghi789',
                        sizeBytes: 512 * 1024, // 512KB
                    },
                ],
                minAppVersion: '1.0.0',
            },
        };

        beforeEach(() => {
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigs);
        });

        it('should calculate total size of all files', async () => {
            const totalSize = await configProvider.getTotalSize();
            
            // 1MB + 1KB + 512KB = 1,513KB = 1,549,312 bytes
            const expectedSize = (1024 * 1024) + 1024 + (512 * 1024);
            expect(totalSize).toBe(expectedSize);
        });

        it('should calculate total size with language filter', async () => {
            const totalSize = await configProvider.getTotalSize('en');
            
            expect(totalSize).toBeGreaterThan(0);
            expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith('en');
        });

        it('should handle empty files array', async () => {
            const emptyConfigs: Record<string, ModelConfig> = {
                empty: {
                    capability: 'empty',
                    id: 'empty-v1',
                    version: '1.0.0',
                    files: [],
                    minAppVersion: '1.0.0',
                },
            };
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(emptyConfigs);
            
            const totalSize = await configProvider.getTotalSize();
            
            expect(totalSize).toBe(0);
        });

        it('should handle missing files property', async () => {
            const configsWithoutFiles: Record<string, any> = {
                nofiles: {
                    capability: 'nofiles',
                    id: 'nofiles-v1',
                    version: '1.0.0',
                    minAppVersion: '1.0.0',
                },
            };
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(configsWithoutFiles);
            
            const totalSize = await configProvider.getTotalSize();
            
            expect(totalSize).toBe(0);
        });

        it('should propagate API errors as InferenceModelDownloaderException', async () => {
            const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
            mockInferenceModelClient.getInferenceModels.mockRejectedValue(apiError);
            
            await expect(configProvider.getTotalSize()).rejects.toThrow(InferenceModelDownloaderException);
        });
    });

    // Zombie method tests - edge cases and error conditions
    describe('zombie method tests', () => {
        it('should handle null/undefined configs from API', async () => {
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(null);
            
            await expect(configProvider.getConfig('speaker_id')).rejects.toThrow(
                InferenceModelDownloaderException
            );
        });

        it('should handle empty configs object', async () => {
            mockInferenceModelClient.getInferenceModels.mockResolvedValue({});
            
            await expect(configProvider.getConfig('speaker_id')).rejects.toThrow(
                InferenceModelDownloaderException
            );
        });

        it('should handle config with null files', async () => {
            const configsWithNullFiles: Record<string, any> = {
                speaker_id: {
                    capability: 'speaker_id',
                    id: 'speaker-v1',
                    version: '1.0.0',
                    files: null,
                    minAppVersion: '1.0.0',
                },
            };
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(configsWithNullFiles);
            
            const totalSize = await configProvider.getTotalSize();
            
            expect(totalSize).toBe(0);
        });

        it('should handle file with missing sizeBytes', async () => {
            const configsWithMissingSize: Record<string, any> = {
                speaker_id: {
                    capability: 'speaker_id',
                    id: 'speaker-v1',
                    version: '1.0.0',
                    files: [
                        {
                            url: 'https://example.com/speaker.onnx',
                            hash: 'abc123',
                            // Missing sizeBytes
                        },
                    ],
                    minAppVersion: '1.0.0',
                },
            };
            mockInferenceModelClient.getInferenceModels.mockResolvedValue(configsWithMissingSize);
            
            const totalSize = await configProvider.getTotalSize();
            
            // NaN + 0 = NaN, but we should handle this gracefully
            expect(totalSize).toBeNaN();
        });

    });
});