/**
 * Repository: Generic CRUD over Observable array with MMKV persistence.
 * Works with Proxy-based Entity. create() and findAll()/find() wrap slots or hydrate from JSON.
 */

import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import type { Observable, ObservableObject } from '@legendapp/state';
import type { AbstractEntity, EntityConstructor } from './AbstractEntity';

export type RecordWithUuid = Record<string, unknown> & { uuid: string };

type PersistedObservableState = { state?: { sync?(): void } };

/**
 * Repository for AbstractEntity instances. Backed by Observable<TRecord[]> with persistObservable(MMKV).
 * - create(data): appends to store, returns new EntityClass(obsSlot) so mutations persist.
 * - findAll() / find(uuid): map stored data -> new EntityClass(obsSlot) or new EntityClass(json).
 */
export class Repository<TEntity extends AbstractEntity> {
    private readonly _data: Observable<RecordWithUuid[]>;
    private readonly EntityClass: EntityConstructor<TEntity>;
    private readonly tableName: string;

    public constructor(
        EntityClass: EntityConstructor<TEntity>,
        tableName: string,
    ) {
        this.EntityClass = EntityClass;
        this.tableName = tableName;
        this._data = observable<RecordWithUuid[]>([]);
        persistObservable(this._data, {
            local: tableName,
            pluginLocal: ObservablePersistMMKV,
        });
    }

    public findAll(): TEntity[] {
        const arr = this._data.get();
        return arr.map((_, index) => this.wrapSlot(index));
    }

    public find(uuid: string): TEntity | undefined {
        const arr = this._data.get();
        const index = arr.findIndex((item) => item.uuid === uuid);
        if (index === -1) return undefined;
        return this.wrapSlot(index);
    }

    /** Create and persist. Pushes data into the store and returns an entity wrapping that slot. */
    public create(data: Partial<RecordWithUuid> & { uuid: string }): TEntity {
        const arr = this._data.get();
        const record = { ...data, uuid: data.uuid } as RecordWithUuid;
        const index = arr.length;
        this._data.set([...arr, record]);
        return this.wrapSlot(index);
    }

    public remove(uuid: string): void {
        const arr = this._data.get();
        this._data.set(arr.filter((item) => item.uuid !== uuid));
    }

    public clear(): void {
        this._data.set([]);
    }

    /**
     * Optional explicit sync when using persistObservable; mutations via Proxy already persist.
     */
    public persist(_entity?: TEntity): void {
        const state = (this._data as unknown as PersistedObservableState).state;
        if (state?.sync) state.sync();
    }

    private wrapSlot(index: number): TEntity {
        const obsItem = (this._data as unknown as Record<number, ObservableObject<RecordWithUuid>>)[
            index
        ];
        return new this.EntityClass(obsItem) as TEntity;
    }
}
