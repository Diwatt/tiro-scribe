/**
 * React Query hooks for Tiro API (profile attributes, inference models).
 * Use these in screens; do not import generated API directly.
 */

import { useQuery } from '@tanstack/react-query';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';

import { ApiClientRegistry } from './ApiClientRegistry';
import { InferenceModelClient } from './Client/InferenceModelClient';
import { ProfileAttributesClient } from './Client/ProfileAttributesClient';

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
        queryFn: () => {
            const logger = Container.get(AppLogger) as AppLogger;
            logger.info('[useProfileAttributes] Fetching profile attributes with locale:', locale);
            return Container.get(ApiClientRegistry).get(ProfileAttributesClient).getProfileAttributes(locale);
        },
        staleTime: options?.staleTime ?? Infinity,
        gcTime: options?.gcTime ?? Infinity,
    });
}

export function useInferenceModels(options?: InferenceModelsQueryOptions) {
    const appLanguage = options?.appLanguage;
    return useQuery({
        queryKey: [...INFERENCE_MODELS_QUERY_KEY, appLanguage] as const,
        queryFn: () => Container.get(ApiClientRegistry).get(InferenceModelClient).getInferenceModels(appLanguage),
        staleTime: options?.staleTime ?? Infinity,
        gcTime: options?.gcTime ?? Infinity,
    });
}
