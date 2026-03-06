/**
 * Api – backend API client registry and hooks.
 * Use apiClientRegistry.get(ProfileAttributesClient) or get(InferenceModelClient); clients are created lazily.
 * Generated types match the API (camelCase; spec is the single source of truth).
 */

/** 1. Client registry – use get(Model) to obtain the client instance (lazy). */
export { ApiClientRegistry } from './ApiClientRegistry';
/** Types (from spec + inference-model client). */
export type { InferenceModelMap, ModelConfig } from './Client/InferenceModelClient';
export { InferenceModelClient } from './Client/InferenceModelClient';
export { ProfileAttributesClient } from './Client/ProfileAttributesClient';
export type {
    InferenceModel,
    InferenceModelFile,
    InferenceModelVariant,
    LabeledOption,
    ProfileAttributes,
} from './generated/Types';
export type { InferenceModelsQueryOptions, ProfileAttributesQueryOptions } from './hooks';
/** 2. React Query hooks and keys. */
export {
    INFERENCE_MODELS_QUERY_KEY,
    PROFILE_ATTRIBUTES_QUERY_KEY,
    useInferenceModels,
    useProfileAttributes,
} from './hooks';
