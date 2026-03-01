/**
 * React Query hooks for Tiro API (profile attributes, inference models).
 * Use these in screens; do not import generated API directly.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClientRegistry, InferenceModelClient, ProfileAttributesClient } from './ApiClientRegistry';

export const INFERENCE_MODELS_QUERY_KEY = ['api', 'inference-models'] as const;
export const PROFILE_ATTRIBUTES_QUERY_KEY = ['api', 'profile-attributes'] as const;

export interface ProfileAttributesQueryOptions {
    gcTime?: number;
    locale?: string;
    staleTime?: number;
}

export interface InferenceModelsQueryOptions {
    appLanguage?: string;
    gcTime?: number;
    staleTime?: number;
}

export function useProfileAttributes(options?: ProfileAttributesQueryOptions) {
    const locale = options?.locale;
    return useQuery({
        queryKey: [...PROFILE_ATTRIBUTES_QUERY_KEY, locale] as const,
        queryFn: () => apiClientRegistry.get(ProfileAttributesClient).getProfileAttributes(locale),
        staleTime: options?.staleTime ?? Infinity,
        gcTime: options?.gcTime ?? Infinity,
    });
}

export function useInferenceModels(options?: InferenceModelsQueryOptions) {
    const appLanguage = options?.appLanguage;
    return useQuery({
        queryKey: [...INFERENCE_MODELS_QUERY_KEY, appLanguage] as const,
        queryFn: () => apiClientRegistry.get(InferenceModelClient).getInferenceModels(appLanguage),
        staleTime: options?.staleTime ?? Infinity,
        gcTime: options?.gcTime ?? Infinity,
    });
}
