/**
 * InferenceModelConfigProvider – Dedicated service for retrieving and managing inference model configurations.
 * Single Responsibility: Fetch model configurations from API and provide local configuration resolution.
 */

import type { ModelConfig } from '@/Api';
import { InferenceModelClient } from '@/Api';
import { ApiClientRegistry } from '@/Api/ApiClientRegistry';
import { Container } from '@/Container';
import { ApiClientException, InferenceModelDownloaderException } from '@/Exception';
import { AppLogger, type LoggerInterface } from '@/Service/Logger';

enum ErrorCodes {
    UnknownCapability = 'UNKNOWN_CAPABILITY',
}

export class InferenceModelConfigProvider {
    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {}

    /**
     * Get a single model configuration by capability key.
     * @param key - Capability identifier (e.g., 'speaker_id')
     * @param appLanguage - Optional language filter
     * @throws {ApiClientException} If capability is unknown
     * @throws {InferenceModelDownloaderException} If API request fails
     */
    public async getConfig(key: string, appLanguage?: string): Promise<ModelConfig> {
        try {
            const resolved = await Container.get(ApiClientRegistry)
                .get(InferenceModelClient)
                .getInferenceModels(appLanguage);
            if (!resolved || typeof resolved !== 'object') {
                throw new ApiClientException('Configs unavailable or not an object', ErrorCodes.UnknownCapability);
            }
            const one = resolved[key];
            if (one == null) {
                throw new ApiClientException(`Unknown capability: ${key}`, ErrorCodes.UnknownCapability);
            }
            return one;
        } catch (error) {
            this.logger.warn('[InferenceModelConfigProvider] getConfig failed', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new InferenceModelDownloaderException(
                error instanceof Error
                    ? error.message
                    : 'Model configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Get all model configurations.
     * @param appLanguage - Optional language filter
     * @throws {InferenceModelDownloaderException} If API request fails
     */
    public async getConfigs(appLanguage?: string): Promise<Record<string, ModelConfig>> {
        try {
            const apiClient = Container.get(ApiClientRegistry).get(InferenceModelClient);
            const configs = await apiClient.getInferenceModels(appLanguage);
            if (!configs || typeof configs !== 'object') {
                return {};
            }
            return configs;
        } catch (error) {
            this.logger.warn('[InferenceModelConfigProvider] getInferenceModels failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new InferenceModelDownloaderException(
                error instanceof Error
                    ? error.message
                    : 'Model configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /**
     * Calculate total size of all model configurations.
     * @param appLanguage - Optional language filter
     */
    public async getTotalSize(appLanguage?: string): Promise<number> {
        const configs = await this.getConfigs(appLanguage);
        let totalSize = 0;

        for (const config of Object.values(configs)) {
            if (Array.isArray(config.files) && config.files.length > 0) {
                for (const file of config.files) {
                    const size = typeof file.sizeBytes === 'number' ? file.sizeBytes : 0;
                    totalSize += size;
                }
            }
        }

        return totalSize;
    }
}

Container.register(InferenceModelConfigProvider, () => new InferenceModelConfigProvider(AppLogger.getInstance()));
