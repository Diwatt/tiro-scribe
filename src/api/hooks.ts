/**
 * React Query hooks for Tiro API (clinical attributes, artifacts).
 * Use these in screens; do not import generated API directly.
 */

import { useQuery } from '@tanstack/react-query';
import {
    apiRegistry,
    ClinicalAttributes,
    ModelArtifact,
} from './ApiRegistry';

export const ARTIFACTS_QUERY_KEY = ['api', 'artifacts'] as const;
export const CLINICAL_ATTRIBUTES_QUERY_KEY = [
    'api',
    'clinical-attributes',
] as const;

export function useClinicalAttributes(options?: {
    locale?: string;
    staleTime?: number;
    gcTime?: number;
}) {
    const locale = options?.locale;
    return useQuery({
        queryKey: [...CLINICAL_ATTRIBUTES_QUERY_KEY, locale] as const,
        queryFn: () =>
            apiRegistry.get(ClinicalAttributes).getClinicalAttributes(locale),
        staleTime: options?.staleTime ?? Infinity,
        gcTime: options?.gcTime ?? Infinity,
    });
}

export function useArtifacts(options?: {
    appLanguage?: string;
    staleTime?: number;
    gcTime?: number;
}) {
    const appLanguage = options?.appLanguage;
    return useQuery({
        queryKey: [...ARTIFACTS_QUERY_KEY, appLanguage] as const,
        queryFn: () =>
            apiRegistry.get(ModelArtifact).getArtifacts(appLanguage),
        staleTime: options?.staleTime ?? Infinity,
        gcTime: options?.gcTime ?? Infinity,
    });
}
