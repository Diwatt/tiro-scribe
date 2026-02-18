/**
 * Client for inference-models API (GET /inference-models). Cached; resolves variants by app language.
 * To remove client-side triage entirely, add optional ?language= to GET /inference-models and have the server return one variant per capability.
 */

import { getInferenceModels } from '../generated/Sdk';
import type { InferenceModel, InferenceModelVariant } from '../generated/Types';
import { AbstractClient } from './AbstractClient';

/** One inference model variant chosen for a capability (files, version). Derived from generated InferenceModelVariant. */
export type SelectedVariant = Pick<InferenceModelVariant, 'id' | 'version' | 'files' | 'minAppVersion'> & {
    capability: string;
};

/** Map of capability to InferenceModel (raw API response). */
export type InferenceModelMap = Record<string, InferenceModel>;

export class InferenceModelClient extends AbstractClient {
    private static readonly CACHE_KEY_INFERENCE_MODELS = 'inference-models';

    /**
     * Resolves one variant per capability. Pass app locale from AppLanguage.getLocale() (primary tag: en, fr) to match API variant.language (same format).
     */
    public async getInferenceModels(appLanguage?: string): Promise<Record<string, SelectedVariant>> {
        const list = await this.fetchOrThrow<InferenceModel[]>(
            () => getInferenceModels({ client: this.client, throwOnError: true }),
            InferenceModelClient.CACHE_KEY_INFERENCE_MODELS,
        );
        const result: Record<string, SelectedVariant> = {};

        for (const model of list) {
            const variant = this.resolveVariant(model.variants, appLanguage);
            if (variant != null) {
                const { id, version, files, minAppVersion } = variant;
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

    private resolveVariant(
        variants: InferenceModelVariant[],
        appLanguage?: string,
    ): InferenceModelVariant | undefined {
        if (appLanguage != null) {
            const byLanguage = variants.find((v) => v.language === appLanguage);
            if (byLanguage != null) {
                return byLanguage;
            }
        }

        return variants.find((v) => v.isDefault) ?? variants[0];
    }
}
