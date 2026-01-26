/**
 * AbstractEntity: base class for "Class-Is-Schema" pattern (SRP: orchestration only).
 * No Proxy; entities declare explicit get/set and field$ using a single protected _state$ store.
 * Record shape is implied by the dev's getter/setter types (e.g. get createdAt$(): ObservablePrimitive<number>).
 */

import { observable } from '@legendapp/state';
import type { ObservableObject } from '@legendapp/state';
import { getDefaultsFromMetadata, getPrimaryKeyName } from './Decorators';
import type { ObservableNode, ObservablePrimitive } from './Type';

/** Observable store: index by field name to get node with get/set. */
type ObservableStore = Record<string, ObservableNode>;

/**
 * Constructor input: either plain data (merged with defaults) or an existing Legend-State observable (e.g. from Repository).
 */
export type EntityStateInput =
    | Partial<Record<string, unknown>>
    | ObservableObject<Record<string, unknown>>;

/**
 * Base class for entities. Subclasses use @Entity and @Column; each column has
 * explicit get/set (and get fieldName$() returning this.field$('fieldName')).
 *
 * Constructor: pass plain data (e.g. from create/hydration) or an existing observable (e.g. from Repository slot).
 */
export abstract class AbstractEntity {
    /** Table name (set by @Entity decorator). */
    public static entityName: string;

    /** Observable state. Use for field$ and getField/setField. */
    protected _state$!: ObservableObject<Record<string, unknown>>;

    public constructor(dataOrObservable?: EntityStateInput) {
        const defaults = getDefaultsFromMetadata(this.constructor) ?? {};

        if (this.isObservable(dataOrObservable)) {
            this._state$ = dataOrObservable;
            return;
        }
        const merged = { ...defaults, ...(dataOrObservable ?? {}) };
        this._state$ = observable(merged);
    }

    /** Primary key (e.g. UUID) for repository keying. Resolves field name from @PrimaryKey. */
    public get primaryKey(): string {
        return this.getField<string>(this.primaryKeyField) ?? '';
    }

    public set primaryKey(value: string) {
        this.setField(this.primaryKeyField, value);
    }

    private get primaryKeyField(): string {
        return getPrimaryKeyName(this.constructor) ?? 'uuid';
    }

    /** Serializable shape for persistence / JSON. */
    public toJSON<T = Record<string, unknown>>(): T {
        const root = this._state$ as unknown as { get?(): unknown };
        return (root?.get?.() ?? {}) as T;
    }

    /** Value access: use in get fieldName() { return this.getField<Type>('fieldName'); } — dev supplies type. */
    protected getField<T = unknown>(key: string): T {
        const node = (this._state$ as ObservableStore)[key];
        return node?.get?.() as T;
    }

    /** Value access: use in set fieldName(v) { this.setField('fieldName', v); } — dev types the setter param. */
    protected setField(key: string, value: unknown): void {
        const node = (this._state$ as ObservableStore)[key];
        node?.set?.(value);
    }

    /** Observable node for a field. Use in get fieldName$() { return this.getField$(key); } */
    protected getField$(key: string): ObservableNode {
        const node = (this._state$ as ObservableStore)[key];
        return node ?? { get: undefined, set: undefined };
    }

    /** Field observable. Use in get fieldName$() { return this.field$<Type>('fieldName'); } — dev supplies type. */
    protected field$<T = unknown>(key: string): ObservablePrimitive<T> {
        return this.getField$(key) as ObservablePrimitive<T>;
    }

    private isObservable(
        obj: unknown,
    ): obj is ObservableObject<Record<string, unknown>> {
        return (
            typeof obj === 'object' &&
            obj != null &&
            'get' in obj &&
            typeof (obj as { get: unknown }).get === 'function'
        );
    }
}

/** Constructor shape required by Registry/Repository: new (dataOrObservable?) => TEntity, plus static entityName. */
export type EntityConstructor<TEntity extends AbstractEntity> = (new (
    dataOrObservable?: EntityStateInput,
) => TEntity) & Pick<typeof AbstractEntity, 'entityName'>;
