/**
 * AbstractEntity: base class for "Class-Is-Schema" pattern (SRP: orchestration only).
 * No Proxy; entities use a single protected state store. @Column wires each property so that
 * reading/writing this.fieldName goes through getField/setField (fieldValues).
 */

import { observable } from '@legendapp/state';
import type { MetadataConstructor } from '../Decorator/Type';
import { EntityMetadata } from './Decorator';
import type { ColumnOptions } from './Decorator/Column';

/** Constructor input: plain data for create/hydration. */
export type EntityConstructorInput = Partial<Record<string, unknown>>;

/** Static contract for entity classes. Subclasses satisfy this via @Entity (entityName) and their constructor. */
export interface EntityClassStatic<TEntity extends AbstractEntity = AbstractEntity> {
    new (...args: unknown[]): TEntity;
    readonly name: string;
    entityName: string;
}

/**
 * Base class for entities. Subclasses use @Entity and @Column; each column has explicit get/set.
 *
 * Static members: entityName (set by @Entity). Decorator data from EntityMetadata.for(construct).
 * Decorator data (primary key, column names) come from EntityMetadata.
 *
 * Constructor: pass plain data (e.g. from create/hydration). Rest args satisfy ClassConstructor for @Entity decorator typing.
 */
export abstract class AbstractEntity {
    // --- Properties: static first, then instance (protected → private) ---
    /** Table name (set by @Entity decorator on each subclass). */
    public static entityName: string;

    /** Field name → value. Used by getField/setField. */
    protected fieldValues: Map<string, unknown> = new Map();

    /** Metadata for this entity constructor (resolved once at construction). */
    private readonly entityMetadata: EntityMetadata;

    // --- Constructor ---
    public constructor(...args: unknown[]) {
        const data = args[0] as EntityConstructorInput | undefined;
        this.entityMetadata = EntityMetadata.for(this.constructor as MetadataConstructor);

        const defaults = this.entityMetadata.getColumnDefaults();
        const input = data != null && typeof data === 'object' ? data : {};
        const merged = { ...defaults, ...input };
        this.fieldValues = new Map(Object.entries(merged));
    }

    // --- Methods: public → private ---
    /** Primary key (e.g. UUID) for repository keying. Resolves field name from @PrimaryKey. */
    public get primaryKey(): string {
        return this.getField<string>(this.entityMetadata.getPrimaryKeyField()) ?? '';
    }

    public set primaryKey(value: string) {
        this.setField(this.entityMetadata.getPrimaryKeyField(), value);
    }

    /** Value access. Public so Column initializer can wire get/set; subclasses use in get fieldName() { return this.getField<Type>('fieldName'); } */
    public getField<T = unknown>(key: string): T {
        return this.fieldValues.get(key) as T;
    }

    /** Value access. Public so Column initializer can wire get/set; subclasses use in set fieldName(v) { this.setField('fieldName', v); } */
    public setField(key: string, value: unknown): void {
        this.fieldValues.set(key, value);
    }

    /**
     * Current entity as a plain object (field name → value) for persistence.
     * Repository.persist(entity) calls this internally; prefer repo.persist(entity).
     * Returns raw field values as stored in fieldValues (not transformed by 'as').
     */
    public toPlainObject(): Record<string, unknown> {
        const columnNames = this.entityMetadata.getColumnNames();
        const out: Record<string, unknown> = {};

        // If column metadata is missing, fall back to all field values
        if (columnNames.length === 0) {
            for (const [key, value] of this.fieldValues) {
                out[key] = value;
            }
        } else {
            for (const key of columnNames) {
                out[key] = this.getField(key);
            }
        }

        return out;
    }

    /**
     * Convert entity to a data object.
     * Returns a plain object suitable for DTOs, with values transformed by 'as' transformers.
     * Differs from toPlainObject in that values are retrieved via property getters (applies 'as' transformers).
     */
    public toDataObject(): Record<string, unknown> {
        const columnNames = this.entityMetadata.getColumnNames();
        const out: Record<string, unknown> = {};
        for (const key of columnNames) {
            // Use property getter to get transformed value (e.g., after 'as' transformer)
            const value = (this as Record<string, unknown>)[key];
            out[key] = value;
        }
        return out;
    }

    /**
     * Convert entity to an observable object with Legend State observables for fields marked observable.
     * Returns an object containing:
     * 1. Plain properties
     * 2. Observable properties (original field name + suffix, default '$')
     * 3. An 'entity' property referencing the original entity instance
     * The return type is T & { entity: AbstractEntity } where T is Record<string, unknown> by default.
     */
    public toObservable<T extends Record<string, unknown> = Record<string, unknown>>(): T & { entity: AbstractEntity } {
        const columnNames = this.entityMetadata.getColumnNames();
        const observableFields = this.entityMetadata.getObservableFields();
        const out: Record<string, unknown> = {};

        // Add plain properties
        for (const key of columnNames) {
            out[key] = (this as Record<string, unknown>)[key];
        }

        // Add observable properties
        for (const field of observableFields) {
            const fieldName = field.getFieldName();
            const opts = field.getOptions<ColumnOptions>();
            const suffix = opts.observableSuffix ?? '$';
            const observableKey = fieldName + suffix;
            // Use property getter to get transformed value
            const value = (this as Record<string, unknown>)[fieldName];
            out[observableKey] = observable(value);
        }

        // Add entity reference
        (out as Record<string, unknown>).entity = this;

        return out as T & { entity: AbstractEntity };
    }
}
