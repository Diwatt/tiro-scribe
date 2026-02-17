/**
 * Base API client: holds the generated Client and provides snake_case → camelCase response conversion.
 */

import camelcaseKeys from 'camelcase-keys';
import find from 'lodash/find';
import first from 'lodash/first';
import get from 'lodash/get';
import mapValues from 'lodash/mapValues';
import reduce from 'lodash/reduce';
import type { Client } from '../generated/client/Index';

export abstract class AbstractClient {
    private static readonly cache = new Map<string, Promise<unknown>>();

    public constructor(protected readonly client: Client) {}

    /**
     * Runs a generated GET fetcher, returns response.data. Empty body and fetch errors are thrown by axios interceptors (ApiRegistry).
     * If cacheKey is set, caches the promise and clears cache on rejection.
     */
    protected fetchOrThrow<TData>(
        fetcher: () => Promise<{ data: TData }>,
        cacheKey?: string,
    ): Promise<TData> {
        const promise = fetcher().then((res) => res.data);

        if (cacheKey == null) {
            return promise;
        }

        const cached = AbstractClient.cache.get(cacheKey);
        if (cached != null) {
            return cached as Promise<TData>;
        }

        AbstractClient.cache.set(cacheKey, promise);
        promise.catch(() => AbstractClient.cache.delete(cacheKey));

        return promise;
    }

    /**
     * For each collection entry: get array at fromPath, pick first element matching predicates (or first), merge toCamel(picked) with extra fields from parent.
     */
    protected pickMap<TItem, TElement>(
        collection: Record<string, TItem>,
        options: {
            fromPath: string;
            predicates: Array<(element: TElement) => boolean>;
            extra?: Record<string, string>;
        },
    ): Record<string, Record<string, unknown>> {
        return mapValues(collection, (entry, entryKey) => {
            const elements = get(entry, options.fromPath) as TElement[];
            const selected =
                reduce(
                    options.predicates,
                    (match, predicate) => match ?? find(elements, predicate),
                    undefined as TElement | undefined,
                ) ?? first(elements);
            const extra =
                options.extra == null
                    ? {}
                    : Object.fromEntries(
                          Object.entries(options.extra).map(([outputKey, sourcePath]) => [
                              outputKey,
                              get(entry, sourcePath) ?? entryKey,
                          ]),
                      );

            return { ...this.toCamel(selected), ...extra };
        });
    }

    /**
     * Converts snake_case keys to camelCase (deep).
     */
    protected toCamel<T>(obj: T): Record<string, unknown> {
        if (obj == null) {
            return {};
        }

        return camelcaseKeys(obj as Record<string, unknown>, { deep: true }) as Record<string, unknown>;
    }
}
