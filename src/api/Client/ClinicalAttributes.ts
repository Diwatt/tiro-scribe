/**
 * Client for clinical-attributes API (onboarding: qualifications, therapy methods, languages).
 */

import { getClinicalAttributes } from '../generated/Sdk';
import type { ClinicalAttributes as ClinicalAttributesResponse } from '../generated/Types';
import { AbstractClient } from './AbstractClient';

export class ClinicalAttributes extends AbstractClient {
    public async getClinicalAttributes(locale?: string): Promise<ClinicalAttributesResponse> {
        return this.fetchOrThrow<ClinicalAttributesResponse>(() =>
            getClinicalAttributes({
                client: this.client,
                query: locale != null ? { locale } : undefined,
                throwOnError: true,
            }),
        );
    }
}
