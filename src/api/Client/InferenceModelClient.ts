/**
 * Client for inference-models API (GET /inference-models). Cached; resolves variants by app language.
 * To remove client-side triage entirely, add optional ?language= to GET /inference-models and have the server return one variant per capability.
 */

import { getInferenceModels } from '../generated/Sdk';
import type { InferenceModel, InferenceModelVariant } from '../generated/Types';
import { AbstractClient } from './AbstractClient';

/** Configuration for a model including files, version, and capability. Derived from generated InferenceModelVariant. */
export type ModelConfig = Pick<InferenceModelVariant, 'id' | 'version' | 'files' | 'minAppVersion'> & {
    capability: string;
};

/** Map of capability to InferenceModel (raw API response). */
export type InferenceModelMap = Record<string, InferenceModel>;

export class InferenceModelClient extends AbstractClient {
    private static readonly cacheKeyInferenceModels = 'inference-models';

    /**
     * Resolves one model configuration per capability. Pass app locale from AppLanguage.getLocale() (primary tag: en, fr) to match API variant.language (same format).
     */
    public async getInferenceModels(appLanguage?: string): Promise<Record<string, ModelConfig>> {
        const list = await this.fetchWithCachedData<InferenceModel[]>(
            () => getInferenceModels({ client: this.client, throwOnError: true }),
            InferenceModelClient.cacheKeyInferenceModels,
        );
        const result: Record<string, ModelConfig> = {};

        for (const model of list) {
            const variant = this.resolveVariant(model.variants, appLanguage);
            if (variant != null) {
                const { id, version, files, minAppVersion } = variant;

                // Defensive check to ensure variant has required fields
                if (!id) {
                    throw new Error(
                        `Model variant for capability '${model.capability}' has no id. This may indicate an API response issue.`,
                    );
                }

                result[model.capability] = {
                    capability: model.capability,
                    id,
                    version,
                    files,
                    minAppVersion,
                };
            }
        }

        return result;
    }

    private resolveVariant(variants: InferenceModelVariant[], appLanguage?: string): InferenceModelVariant | undefined {
        if (appLanguage != null) {
            const byLanguage = variants.find((v) => v.language === appLanguage);
            if (byLanguage != null) {
                return byLanguage;
            }
        }

        return variants.find((v) => v.isDefault) ?? variants[0];
    }
}
