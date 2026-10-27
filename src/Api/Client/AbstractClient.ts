/**
 * Base API client: holds the generated Client, provides caching.
 */

import type { Client } from '../generated/client/Index';

export abstract class AbstractClient {
    private static readonly pendingRequests = new Map<string, Promise<unknown>>();

    public constructor(protected readonly client: Client) {}

    protected fetchWithCachedData<T>(fetcher: () => Promise<{ data: T }>, cacheKey?: string): Promise<T> {
        const promise = fetcher().then((res) => res.data);

        if (cacheKey == null) {
            return promise;
        }

        const existingPromise = AbstractClient.pendingRequests.get(cacheKey) as Promise<T> | undefined;
        if (existingPromise != null) {
            return existingPromise;
        }

        AbstractClient.pendingRequests.set(cacheKey, promise);
        promise.catch(() => AbstractClient.pendingRequests.delete(cacheKey));

        return promise;
    }
}
