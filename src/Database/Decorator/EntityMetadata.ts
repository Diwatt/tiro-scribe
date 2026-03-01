/**
 * Single entry point for reading all entity decorator data (@Entity, @Column, @PrimaryKey, @ForeignKey).
 * Wraps MetadataReader with a Database-oriented API and caches results per constructor.
 * Used by AbstractEntity, RecordNormalizer, Repository, DefinitionBuilder.
 */

import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import snakeCase from 'lodash/snakeCase';
import type { ClassDecorator } from '../../Decorator/ClassDecorator';
import { MetadataReader } from '../../Decorator/MetadataReader';
import type { PropertyDecorator } from '../../Decorator/PropertyDecorator';
import type { MetadataConstructor } from '../../Decorator/Type';
import { DatabaseException } from '../../Exception';
import type { AbstractEntity } from '../AbstractEntity';
import type { Entity } from '../Entity';
import type { ColumnOptions } from './Column';
import type { ForeignKeyOptions } from './ForeignKey';

export interface ForeignKeyColumnRef {
    propertyName: string;
    columnName: string;
}

export class EntityMetadata {
    private static readonly instanceByConstruct = new Map<MetadataConstructor, EntityMetadata>();

    private readonly cache = new Map<string, unknown>();
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
        const values = this.reader.getOptionValuesByProperty('Column', 'default');

        return values != null && typeof values === 'object' ? values : {};
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

    /**
     * Return the column decorator for a given property, if that property has
     * an @Column decorator.  This is a thin convenience wrapper around
     * `getColumnFields()` and saves callers from writing their own `.find`
     * loops every time they want the metadata for a single column.
     */
    public getColumnField(propertyName: string): PropertyDecorator | undefined {
        return this.getColumnFields().find((f) => f.getPropertyName() === propertyName);
    }

    /** All @Column PropertyDecorator instances. Cached. Single source for column data. */
    public getColumnFields(): PropertyDecorator[] {
        return this.getOrCreate('columnFields', () => this.reader.getPropertiesByDecorator('Column'));
    }

    /** All @Column field names. Cached. Derived from getColumnFields(). */
    public getColumnNames(): string[] {
        return this.getOrCreate('columnNames', () => this.getColumnFields().map((f) => f.getPropertyName()));
    }

    /** Columns that have @ForeignKey: property name + snake_case column name. Cached. */
    public getForeignKeyColumns(): ForeignKeyColumnRef[] {
        return this.getOrCreate('foreignKeyColumns', () => {
            const result: ForeignKeyColumnRef[] = [];
            for (const field of this.getColumnFields()) {
                const propertyName = field.getPropertyName();
                if (this.reader.hasDecoratorOnProperty(propertyName, 'ForeignKey')) {
                    result.push({ propertyName, columnName: snakeCase(propertyName) });
                }
            }

            return result;
        });
    }

    /** @ForeignKey options for a property, if present. */
    public getForeignKeyOptions(propertyName: string): ForeignKeyOptions | undefined {
        const foreignKeyDecorator = this.reader.getDecoratorFromProperty(propertyName, 'ForeignKey');
        if (foreignKeyDecorator == null) {
            return undefined;
        }

        // generic method now lets us obtain typed options directly
        return foreignKeyDecorator.getOptions<ForeignKeyOptions>();
    }

    /** Resolve foreign key target entity table name (for DDL). */
    public getForeignKeyTargetTableName(propertyName: string): string | null {
        const options = this.getForeignKeyOptions(propertyName);
        if (options == null) {
            return null;
        }

        const targetClass = this.resolveTargetClass(options.target);
        if (targetClass == null) {
            return null;
        }

        // name is assigned by the decorator and trimmed there; we only
        // guard against the impossible (non‑string or empty) in case a test
        // manually pokes at the static property.
        if (!isString(targetClass.entityName) || isEmpty(targetClass.entityName)) {
            return null;
        }

        return targetClass.entityName;
    }

    /** Default ORDER BY column: created_at if @Column index on createdAt, else primary key column (snake_case). */
    public getOrderByColumnName(): string {
        return this.getOrCreate('orderByColumnName', () => {
            const createdAtField = this.getColumnField('createdAt');
            const hasCreatedAtIndex = createdAtField?.getOptions<ColumnOptions>().index === true;

            return hasCreatedAtIndex ? 'created_at' : snakeCase(this.getPrimaryKeyField());
        });
    }

    /** @Column decorator for the primary key property (for DDL type/length). */
    public getPrimaryKeyColumnField(): PropertyDecorator | undefined {
        const value = this.getOrCreate('primaryKeyColumnField', () => {
            return this.reader.getDecoratorFromProperty(this.getPrimaryKeyField(), 'Column') ?? null;
        });

        return (value as PropertyDecorator | null) ?? undefined;
    }

    /** Primary key column name (snake_case) for SQL. */
    public getPrimaryKeyColumnName(): string {
        return snakeCase(this.getPrimaryKeyField());
    }

    /** Primary key property name. @Entity validates at definition time that exactly one @PrimaryKey exists. */
    public getPrimaryKeyField(): string {
        return this.getOrCreate('primaryKeyField', () => {
            const fromReader = this.reader.getProperty('PrimaryKey');
            if (fromReader != null) {
                return fromReader.getPropertyName();
            }
            throw new DatabaseException(
                `Entity ${this.construct.name ?? 'unknown'} has no primary key metadata. Ensure @PrimaryKey() is applied and Symbol.metadata is supported.`,
                'PRIMARY_KEY_METADATA_MISSING',
                undefined,
                { entityName: this.construct.name },
            );
        });
    }

    /** Optional repository export name from @Entity({ repositoryClass }). Must be exported from @/Repository; Registry throws if missing. */
    public getRepositoryClassName(): string | undefined {
        const value = this.getOrCreate('repositoryClassKey', () => {
            const entity = this.reader.getClass() as ClassDecorator | undefined;

            return entity?.getOption('repositoryClass') ?? null;
        });

        return (value as string | null) ?? undefined;
    }

    /** Table name from @Entity({ tableName }). Callers only use EntityMetadata with @Entity constructors. */
    public getTableName(): string {
        return this.getOrCreate('tableName', () => {
            const entity = this.reader.getClass() as ClassDecorator;
            const maybeName = entity.getOption('tableName');
            // option is stored as unknown; runtime validation ensures a string.
            return String(maybeName);
        });
    }

    /**
     * Simple memo‑cache helper.  If the given key is not already present in the
     * `cache` map, it invokes the factory, stores the result and returns it.
     * Otherwise the existing value is returned.
     *
     * The previous name `getOrSet` was a little vague; `getOrCreate` better
     * conveys that we may run the factory to produce a value.  All callers
     * below have been updated accordingly.
     */
    private getOrCreate<T>(key: string, factory: () => T): T {
        if (!this.cache.has(key)) {
            this.cache.set(key, factory());
        }

        return this.cache.get(key) as T;
    }

    private isEntityConstructor(value: unknown): value is typeof AbstractEntity {
        // simple structural guard rather than `instanceof` so we don't import
        // the class at runtime (avoids cycles).
        if (!isFunction(value)) {
            return false;
        }

        // get the constructor's prototype object
        const proto = Reflect.get(value, 'prototype');
        if (!isObject(proto)) {
            return false;
        }

        // must have the instance method provided by AbstractEntity
        if (!isFunction((proto as unknown as Entity).toPlainObject)) {
            return false;
        }
        return true;
    }

    private resolveTargetClass(target: ForeignKeyOptions['target']): typeof AbstractEntity | null {
        if (!isFunction(target)) {
            return this.isEntityConstructor(target) ? target : null;
        }

        try {
            // attempt invocation; if `target` is a class constructor this will
            // throw a TypeError, which we simply ignore and handle below.
            const result = (target as () => unknown)();
            if (this.isEntityConstructor(result)) {
                return result;
            }
        } catch {
            // ignore and fall through to class-as-target case
        }

        return this.isEntityConstructor(target) ? target : null;
    }
}
