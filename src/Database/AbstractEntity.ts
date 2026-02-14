/**
 * AbstractEntity: base class for "Class-Is-Schema" pattern (SRP: orchestration only).
 * No Proxy; entities use a single protected state store. @Column wires each property so that
 * reading/writing this.fieldName goes through getField/setField (fieldValues).
 */

import type { MetadataConstructor } from '../Decorator/Type';
import { EntityMetadata } from './Decorator';

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
     */
    public toPlainObject(): Record<string, unknown> {
        const columnNames = this.entityMetadata.getColumnNames();
        const out: Record<string, unknown> = {};
        for (const key of columnNames) {
            out[key] = this.getField(key);
        }

        return out;
    }
}

