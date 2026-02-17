/**
 * Api – backend API client registry and hooks.
 * Use apiRegistry.get(ClinicalAttributes) or get(ModelArtifact); clients are created lazily.
 * Generated types match the API (snake_case where the spec defines it).
 */

import type { ModelArtifact } from './generated/Types';

/** 1. Client registry – use get(Model) to obtain the client instance (lazy). */
export {
    apiRegistry,
    ApiRegistry,
    ClinicalAttributes,
    ModelArtifact,
} from './ApiRegistry';

/** 2. React Query hooks and keys. */
export {
    useArtifacts,
    useClinicalAttributes,
    ARTIFACTS_QUERY_KEY,
    CLINICAL_ATTRIBUTES_QUERY_KEY,
} from './hooks';

/** Types (from spec + model-artifact client). */
export type { ArtifactDescriptor } from './Client/ModelArtifact';
export type {
    ClinicalAttributes as ClinicalAttributesData,
    ModelArtifact,
    ModelArtifactVariant,
    SelectOption,
} from './generated/Types';
export type ModelArtifactMap = Record<string, ModelArtifact>;
