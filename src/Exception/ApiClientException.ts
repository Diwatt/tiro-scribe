/**
 * ApiClientException - Thrown when API client requests fail (e.g. fetch error, empty response).
 */

import { TiroScribeException } from './TiroScribeException';

export class ApiClientException extends TiroScribeException {
    public constructor(message: string, code: string, originalError?: Error) {
        super(message, code, originalError);
        this.name = 'ApiClientException';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiClientException);
        }
    }

    /** Returns the error if already ApiClientException, otherwise wraps in a generic fetch-failed exception. */
    public static from(err: unknown): ApiClientException {
        if (err instanceof ApiClientException) {
            return err;
        }

        return new ApiClientException(
            'Request failed. Please check your connection and retry.',
            'FETCH_FAILED',
            err instanceof Error ? err : undefined,
        );
    }
}
