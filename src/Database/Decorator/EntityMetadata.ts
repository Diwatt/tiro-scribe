/**
 * Single entry point for reading all entity decorator data (@Entity, @Column, @PrimaryKey, @ForeignKey).
 * Wraps MetadataReader with a Database-oriented API and caches results per constructor.
 * Used by AbstractEntity, RecordNormalizer, Repository, DefinitionBuilder.
 */

import snakeCase from 'lodash/snakeCase';
import type { EntityDecorator } from '../../Decorator/EntityDecorator';
import { FieldDecorator } from '../../Decorator/FieldDecorator';
import { MetadataReader } from '../../Decorator/MetadataReader';
import { MetadataWriter } from '../../Decorator/MetadataWriter';
import type { MetadataConstructor } from '../../Decorator/Type';
import { DatabaseException } from '../../Exception';
import type { EntityClassStatic } from '../AbstractEntity';
import type { ColumnOptions } from './Column';
import type { ForeignKeyOptions } from './ForeignKey';

export interface ForeignKeyColumnRef {
    propertyName: string;
    columnName: string;
}

type CacheKey =
    | 'columnDefaults'
    | 'columnFields'
    | 'columnNames'
    | 'foreignKeyColumns'
    | 'orderByColumnName'
    | 'primaryKeyColumnField'
    | 'primaryKeyField'
    | 'repositoryClassKey'
    | 'tableName'
    | 'observableFields'
    | 'dataObjectMapping';

export class EntityMetadata {
    private static readonly DECORATOR_COLUMN = 'Column';
    private static readonly DECORATOR_FOREIGN_KEY = 'ForeignKey';
    private static readonly DECORATOR_PRIMARY_KEY = 'PrimaryKey';
    private static readonly FIELD_CREATED_AT = 'createdAt';
    private static readonly instanceByConstruct = new Map<MetadataConstructor, EntityMetadata>();
    private static readonly OPTION_DEFAULT = 'default';
    private static readonly OPTION_REPOSITORY_CLASS = 'repositoryClass';
    private static readonly OPTION_TABLE_NAME = 'tableName';

    private readonly cache = new Map<CacheKey, unknown>();
    private readonly construct: MetadataConstructor;
    private readonly reader: MetadataReader;

    public constructor(reader: MetadataReader, construct: MetadataConstructor) {
        this.reader = reader;
        this.construct = construct;
    }

    /** Returns the same instance per constructor so caches are shared app-wide. */
    public static for(construct: MetadataConstructor): EntityMetadata {
        let instance = EntityMetadata.instanceByConstruct.get(construct);
        if (instance == null) {
            instance = new EntityMetadata(new MetadataReader(construct), construct);
            EntityMetadata.instanceByConstruct.set(construct, instance);
        }

        return instance;
    }

    /** Default values per column (from @Column default). Not cached so per-call defaults (e.g. UUID) stay fresh. */
    public getColumnDefaults(): Record<string, unknown> {
        const values = this.reader.getOptionValuesByField(EntityMetadata.DECORATOR_COLUMN, EntityMetadata.OPTION_DEFAULT);

        return values != null && typeof values === 'object' ? values : {};
    }

    /** All @Column FieldDecorator instances. Cached. Single source for column data. */
    public getColumnFields(): FieldDecorator[] {
        return this.getOrSet('columnFields', () => this.reader.getFieldsByDecorator(EntityMetadata.DECORATOR_COLUMN));
    }

    /** All @Column field names. Cached. Derived from getColumnFields(). */
    public getColumnNames(): string[] {
        return this.getOrSet('columnNames', () => this.getColumnFields().map((f) => f.getFieldName()));
    }

    /** Columns that have @ForeignKey: property name + snake_case column name. Cached. */
    public getForeignKeyColumns(): ForeignKeyColumnRef[] {
        return this.getOrSet('foreignKeyColumns', () => {
            const result: ForeignKeyColumnRef[] = [];
            for (const field of this.getColumnFields()) {
                const propertyName = field.getFieldName();
                const decorators = this.reader.getFieldByProperty(propertyName);
                const hasForeignKey = decorators.some((d) => d.getDecoratorName() === EntityMetadata.DECORATOR_FOREIGN_KEY);
                if (hasForeignKey) {
                    result.push({ propertyName, columnName: snakeCase(propertyName) });
                }
            }

            return result;
        });
    }

    /** @ForeignKey options for a property, if present. */
    public getForeignKeyOptions(propertyName: string): ForeignKeyOptions | undefined {
        const decorators = this.reader.getFieldByProperty(propertyName);
        const foreignKeyDecorator = decorators.find((d) => d.getDecoratorName() === EntityMetadata.DECORATOR_FOREIGN_KEY);
        if (foreignKeyDecorator == null) {
            return undefined;
        }

        return foreignKeyDecorator.getOptions<ForeignKeyOptions>();
    }

    /** Resolve foreign key target entity table name (for DDL). */
    public getForeignKeyTargetTableName(propertyName: string): string | null {
        const options = this.getForeignKeyOptions(propertyName);
        if (options == null) {
            return null;
        }

        let targetClass: EntityClassStatic | undefined;
        if (typeof options.target === 'function') {
            // Check if it's a factory function (returns a class) or a class constructor
            try {
                // Try calling it as a factory function first
                const result = (options.target as () => EntityClassStatic)();
                if (result && typeof result === 'function' && result.prototype && result.entityName) {
                    // It's a factory function that returns a class
                    targetClass = result;
                } else if (options.target.prototype && (options.target as EntityClassStatic).entityName) {
                    // It's already a class constructor
                    targetClass = options.target as EntityClassStatic;
                }
            } catch {
                // If calling fails, it might be a class constructor
                if (options.target.prototype && (options.target as EntityClassStatic).entityName) {
                    targetClass = options.target as EntityClassStatic;
                }
            }
        } else {
            targetClass = options.target as EntityClassStatic;
        }

        const tableName = targetClass?.entityName;
        if (tableName == null || typeof tableName !== 'string' || tableName.trim() === '') {
            return null;
        }

        return tableName;
    }

    /** Default ORDER BY column: created_at if @Column index on createdAt, else primary key column (snake_case). */
    public getOrderByColumnName(): string {
        return this.getOrSet('orderByColumnName', () => {
            const hasCreatedAtIndex = this.getColumnFields().some(
                (f) => f.getFieldName() === EntityMetadata.FIELD_CREATED_AT && f.getOptions<ColumnOptions>().index === true,
            );

            return hasCreatedAtIndex ? 'created_at' : snakeCase(this.getPrimaryKeyField());
        });
    }

    /** @Column decorator for the primary key property (for DDL type/length). */
    public getPrimaryKeyColumnField(): FieldDecorator | undefined {
        const value = this.getOrSet('primaryKeyColumnField', () => {
            const fromReader = this.reader.getFieldByProperty(this.getPrimaryKeyField()).find((f) => f.getDecoratorName() === EntityMetadata.DECORATOR_COLUMN);
            if (fromReader != null) {
                return fromReader;
            }
            const fromFallback = (this.construct as unknown as Record<string, unknown>)[MetadataWriter.PRIMARY_KEY_COLUMN_DEF_KEY] as
                | { propertyName: string; type: string; length?: number }
                | undefined;
            if (fromFallback != null && typeof fromFallback.propertyName === 'string' && typeof fromFallback.type === 'string') {
                return new FieldDecorator(EntityMetadata.DECORATOR_COLUMN, this.construct.name ?? '', fromFallback.propertyName, {
                    type: fromFallback.type,
                    length: fromFallback.length,
                });
            }
            return null;
        });

        return (value as FieldDecorator | null) ?? undefined;
    }

    /** Primary key property name. @Entity validates at definition time that exactly one @PrimaryKey exists. */
    public getPrimaryKeyField(): string {
        return this.getOrSet('primaryKeyField', () => {
            const fromReader = this.reader.getField(EntityMetadata.DECORATOR_PRIMARY_KEY);
            if (fromReader != null) {
                return fromReader.getFieldName();
            }
            const fromFallback = (this.construct as unknown as Record<string, unknown>)[MetadataWriter.PRIMARY_KEY_FIELD_KEY];
            if (typeof fromFallback === 'string') {
                return fromFallback;
            }
            throw new DatabaseException(
                `Entity ${this.construct.name ?? 'unknown'} has no primary key metadata. Ensure @PrimaryKey() is applied and Symbol.metadata is supported.`,
                'PRIMARY_KEY_METADATA_MISSING',
                undefined,
                { entityName: this.construct.name },
            );
        });
    }

    /** Primary key column name (snake_case) for SQL. */
    public getPrimaryKeyColumnName(): string {
        return snakeCase(this.getPrimaryKeyField());
    }

    /**
     * SQL expression for a property in SELECT/WHERE/ORDER BY: table column name (pk or FK) or json_extract(data, '$.propertyName').
     */
    public getColumnExpression(propertyName: string): string {
        if (propertyName === this.getPrimaryKeyField()) {
            return this.getPrimaryKeyColumnName();
        }
        const fk = this.getForeignKeyColumns().find((c) => c.propertyName === propertyName);
        if (fk != null) {
            return fk.columnName;
        }

        return `json_extract(data, '$.${propertyName}')`;
    }

    /** Optional repository export name from @Entity({ repositoryClass }). Must be exported from @/Repository; Registry throws if missing. */
    public getRepositoryClassName(): string | undefined {
        const value = this.getOrSet('repositoryClassKey', () => {
            const entity = this.reader.getEntity() as EntityDecorator | undefined;

            return entity?.getOption(EntityMetadata.OPTION_REPOSITORY_CLASS) ?? null;
        });

        return (value as string | null) ?? undefined;
    }

    /** Table name from @Entity({ tableName }). Callers only use EntityMetadata with @Entity constructors. */
    public getTableName(): string {
        return this.getOrSet('tableName', () => {
            const entity = this.reader.getEntity() as EntityDecorator;

            return entity.getOption(EntityMetadata.OPTION_TABLE_NAME);
        });
    }

    /** All @Column fields where observable === true. */
    public getObservableFields(): FieldDecorator[] {
        return this.getOrSet('observableFields', () => {
            return this.getColumnFields().filter((field) => {
                const opts = field.getOptions<ColumnOptions>();
                return opts.observable === true;
            });
        });
    }

    private getOrSet<T>(key: CacheKey, factory: () => T): T {
        if (!this.cache.has(key)) {
            this.cache.set(key, factory());
        }

        return this.cache.get(key) as T;
    }
}
