/**
 * Client for artifact config API (GET /artifacts). Cached; resolves variants by app language.
 * To remove client-side triage entirely, add optional ?language= to GET /artifacts and have the server return one variant per use_case.
 */

import type { PickedCamelCase } from '../CamelCaseKeys';
import { getArtifacts as getArtifactsApi } from '../generated/Sdk';
import type { ModelArtifactVariant } from '../generated/Types';
import keyBy from 'lodash/keyBy';
import { AbstractClient } from './AbstractClient';

/** One model artifact variant chosen for a use_case (download url, hash, version). Derived from generated ModelArtifactVariant. */
export type ArtifactDescriptor = PickedCamelCase<ModelArtifactVariant, 'id' | 'version' | 'url' | 'hash' | 'sizeBytes' | 'minAppVersion'> & {
    useCase: string;
};

export class ModelArtifact extends AbstractClient {
    private static readonly CACHE_KEY_ARTIFACTS = 'artifacts';

    /**
     * Resolves one variant per use_case. Pass app locale from AppLanguage.getLocale() (primary tag: en, fr) to match API variant.language (same format).
     */
    public async getArtifacts(appLanguage?: string): Promise<Record<string, ArtifactDescriptor>> {
        const list = await this.fetchOrThrow(
            () => getArtifactsApi({ client: this.client, throwOnError: true }),
            ModelArtifact.CACHE_KEY_ARTIFACTS,
        );
        const artifacts = keyBy(list, 'use_case');

        return this.pickMap(artifacts, {
            fromPath: 'variants',
            predicates: [
                ...(appLanguage != null
                    ? [(v: ModelArtifactVariant) => v.language === appLanguage]
                    : []),
                (v: ModelArtifactVariant) => v.default === true,
            ],
            extra: { useCase: 'use_case' },
        }) as Record<string, ArtifactDescriptor>;
    }
}
