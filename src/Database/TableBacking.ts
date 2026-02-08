/**
 * TableBacking: in-memory + persisted backing for one entity table (primaryKey → entry).
 * Owns the Observable<DataMap> and persistObservable setup; exposes get/set by key, has, keys, keysWhere, findOneKeyBy, clear, flush.
 * Used by Repository to manipulate table entries and to get observables at key for entity wrapping.
 */

import type { Observable, ObservableObject } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import isMatch from 'lodash/isMatch';
import omit from 'lodash/omit';

type PersistedObservableState = { state?: { sync?(): void } };

/** One table's data: map from primary key to plain entry. */
export type DataMap = Record<string, Record<string, unknown>>;

export class TableBacking {
    private readonly _data: Observable<DataMap>;

    public constructor(tableName: string) {
        this._data = observable<DataMap>({});
        persistObservable(this._data, {
            local: tableName,
            pluginLocal: ObservablePersistMMKV,
        });
    }

    public get(): DataMap {
        return this._data.get();
    }

    public set(map: DataMap): void {
        this._data.set(map);
    }

    public has(key: string): boolean {
        return key in this._data.get();
    }

    public getEntry(key: string): Record<string, unknown> | undefined {
        return this._data.get()[key];
    }

    public setEntry(key: string, entry: Record<string, unknown>): void {
        this._data.set({ ...this._data.get(), [key]: entry });
    }

    public deleteEntry(key: string): void {
        const map = this._data.get();
        if (!(key in map)) {
            return;
        }
        this._data.set(omit(map, key) as DataMap);
    }

    public keys(): string[] {
        return Object.keys(this._data.get());
    }

    /** Keys where entry matches every key in criteria (strict equality). O(n). */
    public keysWhere(criteria: Record<string, unknown>): string[] {
        const map = this._data.get();
        return this.keys().filter((pk) => this.entryMatchesCriteria(map[pk], criteria));
    }

    /** First key where entry matches criteria, or null. O(n). */
    public findOneKeyBy(criteria: Record<string, unknown>): string | null {
        const map = this._data.get();
        const pk = this.keys().find((k) => this.entryMatchesCriteria(map[k], criteria));
        return pk ?? null;
    }

    private entryMatchesCriteria(entry: Record<string, unknown> | undefined, criteria: Record<string, unknown>): boolean {
        return entry != null && isMatch(entry, criteria);
    }

    public clear(): void {
        this._data.set({});
    }

    /** Flush in-memory state to storage. */
    public flush(): void {
        const state = (this._data as unknown as PersistedObservableState).state;
        if (typeof state?.sync === 'function') state.sync();
    }

    /** Observable at key (for wrapping in entity so mutations persist). */
    public getObservableAtKey(key: string): ObservableObject<Record<string, unknown>> | undefined {
        const data = this._data as unknown as Record<string, ObservableObject<Record<string, unknown>>>;
        return data[key];
    }
}
