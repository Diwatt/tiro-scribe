/**
 * Client for inference-models API (GET /inference-models). Cached; resolves variants by app language.
 * To remove client-side triage entirely, add optional ?language= to GET /inference-models and have the server return one variant per capability.
 */

import type { SystemVerifier } from '@/Service/SystemVerifier';
import type { Client } from '../generated/client/Index';
import { getInferenceModels } from '../generated/Sdk';
import type { InferenceModel, InferenceModelVariant } from '../generated/Types';
import { AbstractClient } from './AbstractClient';

/** Extended variant type with optional requirements for system capability checks. */
export type InferenceModelVariantWithRequirements = InferenceModelVariant & {
    requirements?: Record<string, string>;
};

/** Configuration for a model including files, version, and capability. Derived from generated InferenceModelVariant. */
export type ModelConfig = Pick<
    InferenceModelVariantWithRequirements,
    'id' | 'version' | 'files' | 'minAppVersion' | 'requirements'
> & {
    capability: string;
};

/** Map of capability to InferenceModel (raw API response). */
export type InferenceModelMap = Record<string, InferenceModel>;

export class InferenceModelClient extends AbstractClient {
    public constructor(
        protected readonly client: Client,
        private readonly systemVerifier: SystemVerifier,
    ) {
        super(client);
    }

    /**
     * Resolves one model configuration per capability. Pass app locale from Localization.getLocale() (primary tag: en, fr) to match API variant.language (same format).
     */
    public async getInferenceModels(appLanguage?: string): Promise<Record<string, ModelConfig>> {
        const list = await this.fetchWithCachedData<InferenceModel[]>(
            () => getInferenceModels({ client: this.client, throwOnError: true }),
            'inference-models',
        );
        const result: Record<string, ModelConfig> = {};

        for (const model of list) {
            const variant = await this.resolveVariant(
                model.variants as InferenceModelVariantWithRequirements[],
                appLanguage,
            );
            if (variant != null) {
                const { id, version, files, minAppVersion, requirements } = variant;

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
                    requirements,
                };
            }
        }

        return result;
    }

    private async resolveVariant(
        variants: InferenceModelVariantWithRequirements[],
        appLanguage?: string,
    ): Promise<InferenceModelVariantWithRequirements | undefined> {
        // Filter variants asynchronously to keep only those supported by the system
        const validVariants: InferenceModelVariantWithRequirements[] = [];
        for (const variant of variants) {
            if (await this.systemVerifier.isSupported(variant.requirements)) {
                validVariants.push(variant);
            }
        }

        // Apply existing selection logic on valid variants
        if (appLanguage != null) {
            const byLanguage = validVariants.find((v) => v.language === appLanguage);
            if (byLanguage != null) {
                return byLanguage;
            }
        }

        return validVariants.find((v) => v.isDefault) ?? validVariants[0];
    }
}
