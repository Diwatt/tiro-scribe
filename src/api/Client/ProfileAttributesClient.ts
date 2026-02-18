/**
 * Client for profile-attributes API (onboarding: qualifications, therapy methods, languages).
 */

import { getProfileAttributes } from '../generated/Sdk';
import type { ProfileAttributes } from '../generated/Types';
import { AbstractClient } from './AbstractClient';

export class ProfileAttributesClient extends AbstractClient {
    public async getProfileAttributes(locale?: string): Promise<ProfileAttributes> {
        return this.fetchOrThrow<ProfileAttributes>(() =>
            getProfileAttributes({
                client: this.client,
                query: locale != null ? { locale } : undefined,
                throwOnError: true,
            }),
        );
    }
}
