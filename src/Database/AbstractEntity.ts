/**
 * AbstractEntity: base class for "Class-Is-Schema" pattern (SRP: orchestration only).
 * No Proxy; entities use a single protected state store. @Column wires each property so that
 * reading/writing this.fieldName goes through getField/setField (fieldValues).
 */

import type { MetadataConstructor } from '../Decorator/Type';
import { EntityMetadata } from './Decorator';
import type { ColumnOptions } from './Decorator/Column';
/**
 * Core abstract entity for all database tables.  It stores field values,
 * applies defaults, and defines property accessors; subclasses merely add
 * metadata via decorators.
 */
import type { Entity } from './Entity';
import { TransformerRegistry } from './Transformer';

export abstract class AbstractEntity implements Entity {
    /**
     * Tracks which prototypes have had their column accessors wired.  Stored in
     * a WeakSet so we don’t need to pollute instances with any marker and so
     * classes can be garbage‑collected normally.  Placed alongside other static
     * properties rather than in the middle of method definitions.
     */
    private static readonly initializedPrototypes = new WeakSet<object>();
    // --- Properties: static first, then instance (protected → private) ---
    /** Table name (set by @Entity decorator on each subclass). */
    public static entityName: string;
    /** Field name → value. Used by getField/setField. */
    protected fieldValues: Map<string, unknown> = new Map();
    /** Metadata for this entity constructor (resolved once at construction). */
    private readonly entityMetadata: EntityMetadata;

    // --- Constructor ---
    public constructor(...args: unknown[]) {
        const data = args[0] as Partial<Record<string, unknown>> | undefined;
        this.entityMetadata = EntityMetadata.for(this.constructor as MetadataConstructor);

        const defaults = this.entityMetadata.getColumnDefaults();
        const input = data != null && typeof data === 'object' ? data : {};
        const merged = { ...defaults, ...input };
        this.fieldValues = new Map(Object.entries(merged));

        this.ensureColumnAccessors();
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
     * Define getters/setters for all columns on the prototype, once per class.
     *
     * We used to wire accessors on every instance which meant calling
     * `Object.defineProperty` for each column on every construction.  That
     * still worked, but it was wasteful and meant the getters captured the
     * wrong `this` if we later tried to move the logic to the prototype.
     *
     * By performing the wiring on the prototype and tracking a simple boolean
     * flag we avoid the repeated work.  Accessors use plain functions so that
     * `this` refers to the concrete entity instance when the property is
     * accessed.
     */
    private ensureColumnAccessors(): void {
        // prototype object for this class; we only ever store it in a WeakSet so
        // a plain object type is sufficient and avoids needless casts.
        const proto = Object.getPrototypeOf(this);
        if (AbstractEntity.initializedPrototypes.has(proto)) {
            return;
        }

        for (const field of this.entityMetadata.getColumnFields()) {
            const propertyName = field.getPropertyName();
            const options = field.getOptions<ColumnOptions>();
            const transformer = options.as != null ? TransformerRegistry.get(options.as) : undefined;

            Object.defineProperty(proto, propertyName, {
                configurable: true,
                enumerable: true,
                get(this: AbstractEntity) {
                    const raw = this.getField(propertyName);
                    return transformer != null ? transformer.fromStorage(raw) : raw;
                },
                set(this: AbstractEntity, value: unknown) {
                    if (value === undefined && this.fieldValues.has(propertyName)) {
                        return;
                    }

                    const stored = transformer != null ? transformer.toStorage(value) : value;
                    this.setField(propertyName, stored);
                },
            });
        }

        AbstractEntity.initializedPrototypes.add(proto);
    }
}
