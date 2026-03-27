/**
 * InferenceModelConfigProvider tests.
 * Tests configuration retrieval, error handling, and size calculation.
 * Includes "zombie method" tests for edge cases and error conditions.
 */


// Mock the Api module
jest.mock('@/Api', () => ({
    apiClientRegistry: {
        get: jest.fn(),
    },
    InferenceModelClient: class InferenceModelClient {},
}));

// NOW import modules after mocks are in place
import { InferenceModelConfigProvider } from '@/Service/InferenceModelConfigProvider';
import { InferenceModelClient } from '@/Api';
import { ApiClientException, InferenceModelDownloaderException } from '@/Exception';
import type { ModelConfig } from '@/Api';
import { Container } from '@/Core/Container';
import { AppLogger } from '@/Core/AppLogger';

describe('InferenceModelConfigProvider', () => {
    let configProvider: InferenceModelConfigProvider;
    let mockLogger: any;
    let mockInferenceModelClient: any;
    let mockApiClientRegistry: any;
    let containerGetSpy: any;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
        mockInferenceModelClient = {
            getInferenceModels: jest.fn(),
        };
        
        // Create a mock ApiClientRegistry instance
        mockApiClientRegistry = {
            get: jest.fn((clientType: any) => {
                if (clientType === InferenceModelClient) {
                    return mockInferenceModelClient;
                }
                return undefined;
            }),
        };
        
        // Spy on Container.get and mock it to return our mock registry
        containerGetSpy = jest.spyOn(Container, 'get').mockReturnValue(mockApiClientRegistry);
        
        configProvider = new InferenceModelConfigProvider(mockLogger);
    });

    afterEach(() => {
        containerGetSpy.mockRestore();
    });

    // getConfig tests
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

    it('should return config for existing capability', async () => {
        mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigs);
        const config = await configProvider.getConfig('speaker_id');
        expect(config).toEqual(mockConfigs.speaker_id);
        expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith(undefined);
    });

    it('should return config with language filter', async () => {
        mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigs);
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
                error: apiError.message
            })
        );
    });

    // getConfigs tests
    const mockConfigsAll: Record<string, ModelConfig> = {
        speaker_id: {
            capability: 'speaker_id',
            id: 'speaker-v1',
            version: '1.0.0',
            files: [],
            minAppVersion: '1.0.0',
        },
    };

    it('should return all configs', async () => {
        mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigsAll);
        const configs = await configProvider.getConfigs();
        expect(configs).toEqual(mockConfigsAll);
        expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith(undefined);
    });

    it('should return configs with language filter', async () => {
        mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigsAll);
        const configs = await configProvider.getConfigs('fr');
        expect(configs).toEqual(mockConfigsAll);
        expect(mockInferenceModelClient.getInferenceModels).toHaveBeenCalledWith('fr');
    });

    it('should propagate API errors as InferenceModelDownloaderException', async () => {
        const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
        mockInferenceModelClient.getInferenceModels.mockRejectedValue(apiError);
        await expect(configProvider.getConfigs()).rejects.toThrow(InferenceModelDownloaderException);
    });

    // getTotalSize tests
    it('should calculate total size from all configs', async () => {
        mockInferenceModelClient.getInferenceModels.mockResolvedValue(mockConfigs);
        const totalSize = await configProvider.getTotalSize();
        expect(totalSize).toBe((1024 * 1024) + (512 * 1024));
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

    it('should propagate API errors as InferenceModelDownloaderException from getTotalSize', async () => {
        const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
        mockInferenceModelClient.getInferenceModels.mockRejectedValue(apiError);
        await expect(configProvider.getTotalSize()).rejects.toThrow(InferenceModelDownloaderException);
    });

    // Zombie method tests - edge cases and error conditions
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
        expect(totalSize).toBe(0);
    });

    it('should verify mockApiClientRegistry.get mock', () => {
        // Set up the mock return value for this test
        (mockApiClientRegistry.get as any).mockReturnValue(mockInferenceModelClient);
        const client = mockApiClientRegistry.get('inference');
        expect(client).toBe(mockInferenceModelClient);
        expect(client.getInferenceModels).toBeDefined();
    });
});