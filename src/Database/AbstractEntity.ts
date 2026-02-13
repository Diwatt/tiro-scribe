/**
 * AbstractEntity: base class for "Class-Is-Schema" pattern (SRP: orchestration only).
 * No Proxy; entities use a single protected state store. @Column wires each property so that
 * reading/writing this.fieldName goes through getField/setField (fieldValues).
 */

import { MetadataReader } from '../Decorator';
import { MetadataWriter } from '../Decorator/MetadataWriter';
import type { MetadataConstructor } from '../Decorator/Type';
import { DatabaseException } from '../Exception';

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
 * Static members (only two public): entityName (set by @Entity), resolvePrimaryKeyField(construct).
 * Private static cache + helper for column names stay on the class (no standalone functions).
 *
 * Constructor: pass plain data (e.g. from create/hydration). Rest args satisfy ClassConstructor for @Entity decorator typing.
 */
export abstract class AbstractEntity {
    // --- Properties: static first, then instance (protected → private) ---
    /** Table name (set by @Entity decorator on each subclass). */
    public static entityName: string;

    /** Cached column names per constructor (used by toPlainObject). */
    private static readonly columnNamesByConstructor = new Map<MetadataConstructor, string[]>();

    /** Field name → value. Used by getField/setField. */
    protected fieldValues: Map<string, unknown> = new Map();

    /** Primary key field name (resolved once at construction). */
    private readonly resolvedPrimaryKeyFieldName: string = '';

    // --- Constructor ---
    public constructor(...args: unknown[]) {
        const data = args[0] as EntityConstructorInput | undefined;
        const primaryKeyField = AbstractEntity.resolvePrimaryKeyField(this.constructor);
        if (primaryKeyField == null) {
            throw new DatabaseException(`Entity ${this.constructor.name} must define a primary key with @PrimaryKey().`, 'PRIMARY_KEY_NOT_DEFINED', undefined, {
                entityName: this.constructor.name,
            });
        }
        this.resolvedPrimaryKeyFieldName = primaryKeyField;

        const reader = new MetadataReader(this.constructor);
        const columnDefaults = reader.getOptionValuesByField('Column', 'default');
        const defaults = columnDefaults != null && typeof columnDefaults === 'object' ? columnDefaults : {};
        const input = data != null && typeof data === 'object' ? data : {};
        const merged = { ...defaults, ...input };
        this.fieldValues = new Map(Object.entries(merged));
    }

    // --- Methods: public → private ---
    /** Primary key (e.g. UUID) for repository keying. Resolves field name from @PrimaryKey. */
    public get primaryKey(): string {
        return this.getField<string>(this.primaryKeyField) ?? '';
    }

    public set primaryKey(value: string) {
        this.setField(this.primaryKeyField, value);
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
        const columnNames = this.getColumnNames();
        const out: Record<string, unknown> = {};
        for (const key of columnNames) {
            out[key] = this.getField(key);
        }

        return out;
    }

    /**
     * Resolves primary key field name for an entity constructor.
     * Static because callers (e.g. Repository) only have the class, not an instance.
     * MetadataReader first; Hermes fallback when metadata unreadable.
     */
    public static resolvePrimaryKeyField(construct: MetadataConstructor): string | undefined {
        const reader = new MetadataReader(construct);
        const fromMetadata = reader.getField('PrimaryKey')?.getFieldName();
        if (fromMetadata != null) {
            return fromMetadata;
        }
        const fallback = (construct as unknown as Record<string, unknown>)[MetadataWriter.PRIMARY_KEY_FIELD_KEY];

        return typeof fallback === 'string' ? fallback : undefined;
    }

    private getColumnNames(): string[] {
        return AbstractEntity.getColumnNamesForConstructor(this.constructor as MetadataConstructor);
    }

    private static getColumnNamesForConstructor(construct: MetadataConstructor): string[] {
        let names = AbstractEntity.columnNamesByConstructor.get(construct);
        if (names == null) {
            const reader = new MetadataReader(construct);
            names = reader
                .getFields()
                .filter((f) => f.getDecoratorName() === 'Column')
                .map((f) => f.getFieldName());
            AbstractEntity.columnNamesByConstructor.set(construct, names);
        }

        return names;
    }

    private get primaryKeyField(): string {
        return this.resolvedPrimaryKeyFieldName;
    }
}
