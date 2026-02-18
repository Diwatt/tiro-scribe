/**
 * Api – backend API client registry and hooks.
 * Use apiClientRegistry.get(ProfileAttributesClient) or get(InferenceModelClient); clients are created lazily.
 * Generated types match the API (camelCase; spec is the single source of truth).
 */

/** 1. Client registry – use get(Model) to obtain the client instance (lazy). */
export {
    apiClientRegistry,
    ApiClientRegistry,
    InferenceModelClient,
    ProfileAttributesClient,
} from './ApiClientRegistry';

/** 2. React Query hooks and keys. */
export {
    useInferenceModels,
    useProfileAttributes,
    INFERENCE_MODELS_QUERY_KEY,
    PROFILE_ATTRIBUTES_QUERY_KEY,
} from './hooks';
export type { InferenceModelsQueryOptions, ProfileAttributesQueryOptions } from './hooks';

/** Types (from spec + inference-model client). */
export type { SelectedVariant, InferenceModelMap } from './Client/InferenceModelClient';
export type {
    InferenceModelFile,
    InferenceModel,
    InferenceModelVariant,
    LabeledOption,
    ProfileAttributes,
} from './generated/Types';
