/**
 * NoActiveSubscriptionError - Exception when an expected subscription is missing
 */

import { TiroScribeException } from './TiroScribeException';

export class NoActiveSubscriptionError extends TiroScribeException {
    constructor() {
        super('No active subscription', 'NO_ACTIVE_SUBSCRIPTION');
        this.name = 'NoActiveSubscriptionError';
    }
}
