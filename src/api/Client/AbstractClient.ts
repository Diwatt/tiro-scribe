/**
 * Base API client: holds the generated Client, provides caching.
 */

import type { Client } from '../generated/client/Index';

export abstract class AbstractClient {
    private static readonly promiseCache = new Map<string, Promise<unknown>>();

    public constructor(protected readonly client: Client) {}

    protected fetchWithCachedData<TData>(fetcher: () => Promise<{ data: TData }>, cacheKey?: string): Promise<TData> {
        const promise = fetcher().then((res) => res.data);

        if (cacheKey == null) {
            return promise;
        }

        const existingPromise = AbstractClient.lookup<TData>(cacheKey);
        if (existingPromise != null) {
            return existingPromise;
        }

        AbstractClient.promiseCache.set(cacheKey, promise);
        promise.catch(() => AbstractClient.promiseCache.delete(cacheKey));

        return promise;
    }

    private static lookup<T>(cacheKey: string): Promise<T> | undefined {
        return AbstractClient.promiseCache.get(cacheKey) as Promise<T> | undefined;
    }
}
