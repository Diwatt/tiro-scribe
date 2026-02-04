/**
 * Repository: Generic CRUD over TableBacking with EntitySerializer.
 * persist(data): create if unknown (pk not in table), else update. find/findAll wrap observables at key.
 *
 * Storage shape (MMKV): one key per entity type (tableName). Value = JSON object keyed by primary key.
 * find(primaryKey) is O(1). One Repository instance per entity type.
 */

import { DatabaseException } from '../Exception';
import type { AbstractEntity, EntityConstructorInput } from './AbstractEntity';
import { MetadataReader } from '../Decorator';
import { TableBacking } from './TableBacking';
import { EntitySerializer } from './Serializer';

/**
 * Repository for AbstractEntity instances. Backed by TableBacking (one table's in-memory + MMKV persistence).
 * - persist(data): create (if pk not in table) or update; returns entity wired to the backing.
 * - find(primaryKey): O(1). findAll(): iteration over table rows (insertion order).
 */
/** Entity class shape accepted by Repository.create (constructor + entityName + optional custom repo). */
type EntityClassForCreate<TEntity extends AbstractEntity> = {
    new (dataOrObservable?: EntityConstructorInput): TEntity;
    entityName: string;
    repositoryClass?: new () => Repository<AbstractEntity>;
};

export class Repository<TEntity extends AbstractEntity> {
    private readonly _backing: TableBacking;
    private readonly EntityClass: new (dataOrObservable?: EntityConstructorInput) => TEntity;
    private readonly tableName: string;
    private readonly primaryKeyField: string;
    private readonly _serializer: EntitySerializer;

    /**
     * Creates the appropriate repository: custom repo if entity defines repositoryClass, else generic Repository.
     */
    public static create<TEntity extends AbstractEntity>(
        entityName: string,
        EntityClass: EntityClassForCreate<TEntity>,
    ): Repository<AbstractEntity> {
        if (EntityClass.repositoryClass) {
            return new EntityClass.repositoryClass();
        }
        return new Repository<TEntity>(EntityClass, entityName);
    }

    protected constructor(
        EntityClass: new (dataOrObservable?: EntityConstructorInput) => TEntity,
        tableName: string,
    ) {
        this.EntityClass = EntityClass;
        this.tableName = tableName;
        this.primaryKeyField = new MetadataReader(EntityClass).getField('PrimaryKey')?.getFieldName() ?? 'uuid';
        this._backing = new TableBacking(tableName);
        this._serializer = new EntitySerializer(EntityClass);
    }

    public findAll(): TEntity[] {
        const map = this._backing.get();
        const migrated = this._serializer.unserializeMap(map);
        this._backing.set(migrated);
        return this._backing.keys().map((pk) => this.createEntityFromKey(pk));
    }

    public exists(primaryKey: string): boolean {
        return this._backing.has(primaryKey);
    }

    public find(primaryKey: string): TEntity | null {
        if (!this.exists(primaryKey)) {
            return null;
        }
        const entry = this._backing.getEntry(primaryKey);
        if (entry == null) {
            return null;
        }
        const migrated = this._serializer.unserialize(entry);
        this._backing.setEntry(primaryKey, migrated as Record<string, unknown>);
        return this.createEntityFromKey(primaryKey);
    }

    /** All entities where entry matches every key in criteria (strict equality). O(n). */
    public findBy(criteria: Record<string, unknown>): TEntity[] {
        const pks = this._backing.keysWhere(criteria);
        for (const pk of pks) {
            const entry = this._backing.getEntry(pk);
            if (entry != null) {
                const migrated = this._serializer.unserialize(entry);
                this._backing.setEntry(pk, migrated as Record<string, unknown>);
            }
        }
        return pks.map((pk) => this.createEntityFromKey(pk));
    }

    /** First entity where entry matches every key in criteria, or null. O(n). */
    public findOneBy(criteria: Record<string, unknown>): TEntity | null {
        const pk = this._backing.findOneKeyBy(criteria);
        if (pk == null) {
            return null;
        }
        return this.find(pk);
    }

    /**
     * Persist: create if entity unknown (pk not in table), else update.
     * Serializer merges defaults + (stored if update) + data; we serialize and write.
     */
    public persist(data: Partial<Record<string, unknown>> = {}): TEntity {
        const map = this._backing.get();
        // First merge: defaults + data → we get the full record and thus the pk (pk may come from defaults).
        const merged = this._serializer.mergeWithDefaults(data);
        const pk = merged[this.primaryKeyField] as string;
        // Second merge only when updating: defaults + stored + data so we overwrite only provided fields.
        const mergedWithStored = this.exists(pk)
            ? this._serializer.mergeWithDefaults(data, map[pk])
            : merged;
        const toStore = this._serializer.serialize(mergedWithStored);
        this._backing.setEntry(pk, toStore);
        return this.createEntityFromKey(pk);
    }

    /** Flush in-memory state to storage. */
    public flush(): void {
        this._backing.flush();
    }

    public remove(primaryKey: string): void {
        this._backing.deleteEntry(primaryKey);
    }

    public clear(): void {
        this._backing.clear();
    }

    private createEntityFromKey(primaryKey: string): TEntity {
        const obs = this._backing.getObservableAtKey(primaryKey);
        if (!obs) {
            throw new DatabaseException(
                `No observable found for key "${primaryKey}" in table "${this.tableName}".`,
                'REPOSITORY_KEY_NOT_FOUND',
                undefined,
                { tableName: this.tableName, primaryKey },
            );
        }
        return new this.EntityClass(obs);
    }
}
