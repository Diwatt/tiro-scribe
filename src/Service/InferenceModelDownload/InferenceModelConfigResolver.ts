/**
 * InferenceModelConfigResolver – Resolves inference model configurations from the API.
 * Single Responsibility: Fetch and resolve model configurations.
 */

import { apiClientRegistry, InferenceModelClient } from '@/Api';
import type { SelectedVariant } from '@/Api';
import { ApiClientException } from '@/Exception';
import { InferenceModelDownloaderException } from '@/Exception/InferenceModelDownloaderException';
import { AppLogger, type LoggerInterface } from '@/Service/Logger';

export class InferenceModelConfigResolver {
    public constructor(private readonly logger: LoggerInterface = AppLogger.getInstance()) {}

    /** Resolved config for one capability; delegates to API client. */
    public async getConfig(key: string, appLanguage?: string): Promise<SelectedVariant> {
        try {
            const resolved = await apiClientRegistry.get(InferenceModelClient).getInferenceModels(appLanguage);
            const one = resolved[key];
            if (one == null) {
                throw new ApiClientException(`Unknown capability: ${key}`, 'UNKNOWN_CAPABILITY');
            }

            return one;
        } catch (error) {
            this.logger.warn('[InferenceModelConfigResolver] getConfig failed', {
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new InferenceModelDownloaderException(
                error instanceof Error ? error.message : 'Model configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }

    /** All configs resolved for the given app language (one per capability); delegates to API client. */
    public async getResolvedConfigs(appLanguage?: string): Promise<Record<string, SelectedVariant>> {
        try {
            return await apiClientRegistry.get(InferenceModelClient).getInferenceModels(appLanguage);
        } catch (error) {
            this.logger.warn('[InferenceModelConfigResolver] getInferenceModels failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new InferenceModelDownloaderException(
                error instanceof Error ? error.message : 'Model configs unavailable. Please check your connection and retry.',
                error instanceof Error ? error : new Error(String(error)),
            );
        }
    }
}
