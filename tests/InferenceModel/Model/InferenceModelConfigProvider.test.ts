/**
 * ConfigProvider tests — contract focused.
 * Tests public API surface: method signatures, return types, error contracts,
 * and zombie edge cases that could break the contract.
 */

import { ConfigProvider } from '@/InferenceModel/ConfigProvider';
import { InferenceModelClient } from '@/Api';
import { ApiClientException, InferenceModelDownloaderException } from '@/Exception';
import type { ModelConfig } from '@/Api';
import { Container } from '@/Core/Container';
import { AppLogger } from '@/Core/AppLogger';

describe('ConfigProvider', () => {
    // -------------------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------------------
    let configProvider: ConfigProvider;
    let mockLogger: AppLogger;
    let mockClient: jest.Mocked<InferenceModelClient>;
    let containerGetSpy: jest.SpyInstance;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as unknown as AppLogger;

        mockClient = {
            getInferenceModels: jest.fn(),
        } as unknown as jest.Mocked<InferenceModelClient>;

        const mockRegistry = {
            get: jest.fn((key: unknown) => {
                if (key === InferenceModelClient) return mockClient;
                return undefined;
            }),
        };

        containerGetSpy = jest.spyOn(Container, 'get').mockReturnValue(mockRegistry as unknown as never);
        configProvider = new ConfigProvider(mockLogger);
    });

    afterEach(() => {
        containerGetSpy.mockRestore();
    });

    // -------------------------------------------------------------------------
    // Fixtures
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // CONTRACT: getConfig(key, appLanguage?) → Promise<ModelConfig>
    // -------------------------------------------------------------------------
    describe('getConfig', () => {
        it('should return config for existing capability', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ speaker_id: speakerConfig, vad: vadConfig });

            const result = await configProvider.getConfig('speaker_id');

            expect(result).toEqual(speakerConfig);
            expect(mockClient.getInferenceModels).toHaveBeenCalledWith(undefined);
        });

        it('should pass language to API when provided', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ speaker_id: speakerConfig });

            await configProvider.getConfig('speaker_id', 'fr');

            expect(mockClient.getInferenceModels).toHaveBeenCalledWith('fr');
        });

        it('should throw InferenceModelDownloaderException for unknown capability', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ speaker_id: speakerConfig });

            await expect(configProvider.getConfig('unknown_capability')).rejects.toThrow(
                InferenceModelDownloaderException,
            );
        });

        it('should throw with correct error code for unknown capability', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ speaker_id: speakerConfig });

            await expect(configProvider.getConfig('unknown_capability')).rejects.toMatchObject({
                code: 'INFERENCE_MODEL_DOWNLOADER_ERROR',
            });
        });

        it('should wrap ApiClientException as InferenceModelDownloaderException', async () => {
            const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
            mockClient.getInferenceModels.mockRejectedValue(apiError);

            await expect(configProvider.getConfig('speaker_id')).rejects.toThrow(
                InferenceModelDownloaderException,
            );
        });

        it('should log warning on API failure', async () => {
            mockClient.getInferenceModels.mockRejectedValue(new Error('Network error'));

            await expect(configProvider.getConfig('speaker_id')).rejects.toThrow();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                '[ConfigProvider] getConfig failed',
                expect.objectContaining({
                    key: 'speaker_id',
                    error: expect.any(String),
                }),
            );
        });
    });

    // -------------------------------------------------------------------------
    // CONTRACT: getConfigs(appLanguage?) → Promise<Record<string, ModelConfig>>
    // -------------------------------------------------------------------------
    describe('getConfigs', () => {
        it('should return all configs as record', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ speaker_id: speakerConfig, vad: vadConfig });

            const result = await configProvider.getConfigs();

            expect(result).toEqual({ speaker_id: speakerConfig, vad: vadConfig });
        });

        it('should pass language to API when provided', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ speaker_id: speakerConfig });

            await configProvider.getConfigs('en');

            expect(mockClient.getInferenceModels).toHaveBeenCalledWith('en');
        });

        it('should return empty object when API returns null', async () => {
            mockClient.getInferenceModels.mockResolvedValue(null as unknown as Record<string, ModelConfig>);

            const result = await configProvider.getConfigs();

            expect(result).toEqual({});
        });

        it('should return empty object when API returns non-object', async () => {
            mockClient.getInferenceModels.mockResolvedValue('not an object' as unknown as Record<string, ModelConfig>);

            const result = await configProvider.getConfigs();

            expect(result).toEqual({});
        });

        it('should propagate ApiClientException as InferenceModelDownloaderException', async () => {
            const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
            mockClient.getInferenceModels.mockRejectedValue(apiError);

            await expect(configProvider.getConfigs()).rejects.toThrow(InferenceModelDownloaderException);
        });
    });

    // -------------------------------------------------------------------------
    // CONTRACT: getTotalSize(appLanguage?) → Promise<number>
    // -------------------------------------------------------------------------
    describe('getTotalSize', () => {
        it('should return sum of all file sizes', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                speaker_id: speakerConfig,
                vad: vadConfig,
            });

            const result = await configProvider.getTotalSize();

            expect(result).toBe((1024 * 1024) + (512 * 1024));
        });

        it('should pass language to API when provided', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ speaker_id: speakerConfig });

            await configProvider.getTotalSize('de');

            expect(mockClient.getInferenceModels).toHaveBeenCalledWith('de');
        });

        it('should return 0 when no configs have files', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                empty: { ...speakerConfig, files: [] },
            });

            const result = await configProvider.getTotalSize();

            expect(result).toBe(0);
        });

        it('should return 0 when config has no files property', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                nofiles: { capability: 'nofiles', id: 'v1', version: '1.0.0', minAppVersion: '1.0.0' },
            } as unknown as Record<string, ModelConfig>);

            const result = await configProvider.getTotalSize();

            expect(result).toBe(0);
        });

        it('should return 0 when file missing sizeBytes', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                missing: {
                    ...speakerConfig,
                    files: [{ url: 'https://example.com/model.onnx', hash: 'abc123' }],
                },
            });

            const result = await configProvider.getTotalSize();

            expect(result).toBe(0);
        });

        it('should propagate API errors as InferenceModelDownloaderException', async () => {
            const apiError = new ApiClientException('API error', 'NETWORK_ERROR');
            mockClient.getInferenceModels.mockRejectedValue(apiError);

            await expect(configProvider.getTotalSize()).rejects.toThrow(InferenceModelDownloaderException);
        });
    });

    // -------------------------------------------------------------------------
    // ZOMBIE: edge cases that should not break the contract
    // -------------------------------------------------------------------------
    describe('zombie edge cases', () => {
        it('should handle null files array', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                nullfiles: { ...speakerConfig, files: null },
            } as unknown as ModelConfig);

            const result = await configProvider.getTotalSize();

            expect(result).toBe(0);
        });

        it('should handle undefined files array', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                undef: { capability: 'undef', id: 'v1', version: '1.0.0', files: undefined, minAppVersion: '1.0.0' },
            } as unknown as ModelConfig);

            const result = await configProvider.getTotalSize();

            expect(result).toBe(0);
        });

        it('should handle negative sizeBytes — code passes through as-is', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                negative: {
                    ...speakerConfig,
                    files: [{ url: 'https://example.com/model.onnx', hash: 'abc123', sizeBytes: -100 }],
                },
            });

            const result = await configProvider.getTotalSize();

            // Contract: getTotalSize passes through the raw sum; negative values are returned as-is
            expect(result).toBe(-100);
        });

        it('should handle non-numeric sizeBytes as 0', async () => {
            mockClient.getInferenceModels.mockResolvedValue({
                nonnumeric: {
                    ...speakerConfig,
                    files: [{ url: 'https://example.com/model.onnx', hash: 'abc123', sizeBytes: 'big' as unknown as number }],
                },
            });

            const result = await configProvider.getTotalSize();

            expect(result).toBe(0);
        });

        it('should handle empty string key as a valid capability', async () => {
            mockClient.getInferenceModels.mockResolvedValue({ '': speakerConfig });

            // Empty string is a valid key; getConfig returns whatever is at that key
            const result = await configProvider.getConfig('');
            expect(result).toEqual(speakerConfig);
        });
    });
});