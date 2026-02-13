/**
 * AbstractEntity: base class for "Class-Is-Schema" pattern (SRP: orchestration only).
 * No Proxy; entities use a single protected _state$ store. @Column wires each property so that:
 * - Reading/writing this.fieldName goes through getField/setField (_state$), so observability is preserved.
 * - this.fieldName$ is the observable node for reactive subscriptions (observer, useSelector).
 * Use getField/setField for key-based access; use field$(key) or this.fieldName$ for the observable.
 */

import type { ObservableObject } from '@legendapp/state';
import { observable } from '@legendapp/state';
import { MetadataReader } from '../Decorator';
import { MetadataWriter } from '../Decorator/MetadataWriter';
import type { MetadataConstructor } from '../Decorator/Type';
import { DatabaseException } from '../Exception';
import type { ObservableNode, ObservablePrimitive } from './Type';

/** Observable store: index by field name to get node with get/set. */
type ObservableStore = Record<string, ObservableNode>;

export type EntityConstructorInput = Partial<Record<string, unknown>> | ObservableObject<Record<string, unknown>>;

/** Static contract for entity classes. Subclasses satisfy this via @Entity (entityName) and their constructor. */
export interface EntityClassStatic<TEntity extends AbstractEntity = AbstractEntity> {
    new (...args: unknown[]): TEntity;
    readonly name: string;
    entityName: string;
}

/**
 * Base class for entities. Subclasses use @Entity and @Column; each column has
 * explicit get/set (and get fieldName$() returning this.field$('fieldName')).
 *
 * Constructor: pass plain data (e.g. from create/hydration) or an existing observable (e.g. from Repository backing).
 * Rest args satisfy ClassConstructor for @Entity decorator typing.
 */
export abstract class AbstractEntity {
    // --- Properties (public → protected → private) ---
    /** Table name (set by @Entity decorator). */
    public static entityName: string;

    /** Observable state. Use for field$ and getField/setField. */
    protected _state$!: ObservableObject<Record<string, unknown>>;

    /** Primary key field name (resolved once at construction). */
    private readonly _primaryKeyField!: string;

    // --- Constructor ---
    public constructor(...args: unknown[]) {
        const dataOrObservable = args[0] as EntityConstructorInput | undefined;
        const primaryKeyField = AbstractEntity.resolvePrimaryKeyField(this.constructor);
        if (primaryKeyField == null) {
            throw new DatabaseException(`Entity ${this.constructor.name} must define a primary key with @PrimaryKey().`, 'PRIMARY_KEY_NOT_DEFINED', undefined, {
                entityName: this.constructor.name,
            });
        }
        this._primaryKeyField = primaryKeyField;

        if (dataOrObservable !== undefined && this.isObservable(dataOrObservable)) {
            this._state$ = dataOrObservable;
            return;
        }

        const reader = new MetadataReader(this.constructor);
        const columnDefaults = reader.getOptionValuesByField('Column', 'default');
        const defaults = columnDefaults != null && typeof columnDefaults === 'object' ? columnDefaults : {};
        const data = dataOrObservable != null && typeof dataOrObservable === 'object' ? dataOrObservable : {};
        const merged = { ...defaults, ...data };
        this._state$ = observable(merged);
    }

    // --- Methods (public → protected → private; getters/setters are methods) ---
    /** Primary key (e.g. UUID) for repository keying. Resolves field name from @PrimaryKey. */
    public get primaryKey(): string {
        return this.getField<string>(this.primaryKeyField) ?? '';
    }

    public set primaryKey(value: string) {
        this.setField(this.primaryKeyField, value);
    }

    /** Value access. Public so Column initializer can wire get/set; subclasses use in get fieldName() { return this.getField<Type>('fieldName'); } */
    public getField<T = unknown>(key: string): T {
        const node = (this._state$ as ObservableStore)[key];
        return node?.get?.() as T;
    }

    /** Value access. Public so Column initializer can wire get/set; subclasses use in set fieldName(v) { this.setField('fieldName', v); } */
    public setField(key: string, value: unknown): void {
        const node = (this._state$ as ObservableStore)[key];
        node?.set?.(value);
    }

    /**
     * Observable node for a field. Public so Column initializer can add fieldName$ getter;
     * subclasses use in get fieldName$() { return this.field$<Type>('fieldName'); }
     */
    public field$<T = unknown>(key: string): ObservablePrimitive<T> {
        const node = (this._state$ as ObservableStore)[key];
        return (node ?? { get: undefined, set: undefined }) as ObservablePrimitive<T>;
    }

    /**
     * Current entity state as a plain record for persistence.
     * Repository.persist(entity) calls this internally; prefer repo.persist(entity).
     */
    public toRecord(): Record<string, unknown> {
        const columnNames = AbstractEntity.getColumnNames(this.constructor as MetadataConstructor);
        const out: Record<string, unknown> = {};
        for (const key of columnNames) {
            out[key] = this.getField(key);
        }
        return out;
    }

    /** Cached column names per entity constructor to avoid repeated MetadataReader work in toRecord(). */
    private static readonly _columnNamesByConstructor = new Map<MetadataConstructor, string[]>();

    private static getColumnNames(construct: MetadataConstructor): string[] {
        let names = AbstractEntity._columnNamesByConstructor.get(construct);
        if (names == null) {
            const reader = new MetadataReader(construct);
            names = reader
                .getFields()
                .filter((f) => f.getDecoratorName() === 'Column')
                .map((f) => f.getFieldName());
            AbstractEntity._columnNamesByConstructor.set(construct, names);
        }
        return names;
    }

    private get primaryKeyField(): string {
        return this._primaryKeyField;
    }

    /** Resolves primary key field name for an entity constructor. MetadataReader first; Hermes fallback when metadata unreadable. */
    public static resolvePrimaryKeyField(construct: MetadataConstructor): string | undefined {
        const reader = new MetadataReader(construct);
        const fromMetadata = reader.getField('PrimaryKey')?.getFieldName();
        if (fromMetadata != null) {
            return fromMetadata;
        }
        const fallback = (construct as unknown as Record<string, unknown>)[MetadataWriter.PRIMARY_KEY_FIELD_KEY];
        return typeof fallback === 'string' ? fallback : undefined;
    }

    private isObservable(obj: unknown): obj is ObservableObject<Record<string, unknown>> {
        return typeof obj === 'object' && obj != null && 'get' in obj && typeof (obj as { get: unknown }).get === 'function';
    }
}
