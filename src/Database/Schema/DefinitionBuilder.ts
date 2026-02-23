/**
 * Builds a TableDefinition from an entity class by reading @Entity / @Column / @PrimaryKey / @ForeignKey metadata.
 * Single responsibility: entity metadata → definition (no SQL, no I/O).
 * Returns TableDefinition so the DDL writer stays decoupled from entity classes (see TableDefinition JSDoc).
 */

import { sql } from 'kysely';
import snakeCase from 'lodash/snakeCase';
import type { PropertyDecorator } from '@/Decorator/PropertyDecorator';
import { DatabaseException } from '@/Exception';
import type { ColumnOptions, EntityMetadata } from '../Decorator';
import { OnDeleteAction } from '../Decorator';
import { qb } from '../Kysely';
import type { FullTextSearchFieldSpec } from './TableDefinition';
import { TableDefinition } from './TableDefinition';

/** Primary key column descriptor for DDL (name, SQL type, optional length). */
interface PrimaryKeyColumnDef {
    columnName: string;
    type: string;
    length?: number;
}

export class DefinitionBuilder {
    /**
     * Format SQL type string; uppercase and optionally include a length.
     * SQLite ignores length, but keeping it matches our schema tests and
     * doesn't hurt readability.
     */
    private formatSqlType(type: string, length?: number): string {
        const upper = type.toUpperCase();
        if (length != null && length > 0) {
            return `${upper}(${length})`;
        }
        return upper;
    }

    private readonly tableName: string;
    private readonly primaryKeyPropertyName: string;
    private readonly primaryKeyColumnName: string;
    private readonly primaryKeyColumn: PrimaryKeyColumnDef;
    private readonly columnFields: PropertyDecorator[];
    /** Property name → " REFERENCES table(column) ON DELETE action" for columns with @ForeignKey. */
    private readonly foreignKeyClauseByPropertyName: Map<string, string>;

    public constructor(metadata: EntityMetadata) {
        this.tableName = metadata.getTableName();
        const primaryKeyColumnField = metadata.getPrimaryKeyColumnField();
        if (primaryKeyColumnField == null) {
            throw new DatabaseException('Entity must have @Entity and @PrimaryKey.', 'ENTITY_METADATA_REQUIRED', undefined);
        }
        this.primaryKeyPropertyName = primaryKeyColumnField.getPropertyName();
        this.primaryKeyColumnName = snakeCase(this.primaryKeyPropertyName);
        const primaryKeyOptions = primaryKeyColumnField.getOptions<ColumnOptions>();
        const primaryKeyType = String(primaryKeyOptions.type).toUpperCase();
        const primaryKeyLength = primaryKeyOptions.length;
        this.primaryKeyColumn = {
            columnName: this.primaryKeyColumnName,
            type: primaryKeyType,
            length: primaryKeyLength,
        };
        this.columnFields = metadata.getColumnFields().filter((f) => f.getPropertyName() !== this.primaryKeyPropertyName);
        this.foreignKeyClauseByPropertyName = this.buildForeignKeyClauses(metadata);
    }

    private buildForeignKeyClauses(metadata: EntityMetadata): Map<string, string> {
        const map = new Map<string, string>();
        const addIfPresent = (propertyName: string): void => {
            const clause = this.getForeignKeyReferencesClause(metadata, propertyName);
            if (clause != null) {
                map.set(propertyName, clause);
            }
        };
        addIfPresent(this.primaryKeyPropertyName);
        for (const field of this.columnFields) {
            addIfPresent(field.getPropertyName());
        }

        return map;
    }

    private getForeignKeyReferencesClause(metadata: EntityMetadata, propertyName: string): string | null {
        const options = metadata.getForeignKeyOptions(propertyName);
        if (options == null) {
            return null;
        }
        const referencedTable = metadata.getForeignKeyTargetTableName(propertyName);
        if (referencedTable == null || referencedTable.trim() === '') {
            throw new DatabaseException('ForeignKey target must be an @Entity class with tableName.', 'INVALID_FOREIGN_KEY_TARGET', undefined, {
                propertyName,
            });
        }
        const referencedColumn = options.column ?? 'uuid';
        const onDelete = options.onDelete ?? OnDeleteAction.Restrict;

        return ` REFERENCES ${referencedTable}(${referencedColumn}) ON DELETE ${onDelete}`;
    }

    /** Returns the shared schema contract; consumed by DefinitionLanguageWriter.write(). */
    public build(): TableDefinition {
        const columns = this.buildColumns();
        const indexes = this.buildIndexes();
        const fullTextSearchFields = this.buildFullTextSearchFields();
        return new TableDefinition(this.tableName, this.primaryKeyColumnName, columns, indexes, fullTextSearchFields);
    }

    /**
     * Builds column DDL: primary key, data, then real columns for @ForeignKey fields, then virtual columns for index-only fields.
     * SQLite forbids REFERENCES on virtual columns, so foreign key fields must be real columns.
     */
    private buildColumns(): string[] {
        const columns: string[] = [];
        const primaryKeySqlType = this.formatSqlType(this.primaryKeyColumn.type, this.primaryKeyColumn.length);
        const primaryKeyFk = this.foreignKeyClauseByPropertyName.get(this.primaryKeyPropertyName) ?? '';

        // Use Kysely's sql template for primary key column
        const primaryKeyColumn = sql`${sql.raw(this.primaryKeyColumn.columnName)} ${sql.raw(primaryKeySqlType)}${sql.raw(primaryKeyFk)} PRIMARY KEY`;
        columns.push(primaryKeyColumn.compile(qb).sql);

        columns.push('data TEXT NOT NULL');

        for (const field of this.columnFields) {
            const propertyName = field.getPropertyName();
            const hasForeignKey = this.foreignKeyClauseByPropertyName.has(propertyName);
            const options = field.getOptions<ColumnOptions>();

            if (hasForeignKey) {
                const sqlType = this.formatSqlType(String(options.type).toUpperCase(), options.length);
                const foreignKeyClause = this.foreignKeyClauseByPropertyName.get(propertyName) ?? '';
                const columnName = snakeCase(propertyName);
                // Use Kysely's sql template for foreign key columns
                const column = sql`${sql.raw(columnName)} ${sql.raw(sqlType)}${sql.raw(foreignKeyClause)}`;
                columns.push(column.compile(qb).sql);
                continue;
            }

            if (options.index === true) {
                const sqlType = this.formatSqlType(String(options.type).toUpperCase(), options.length);
                const { column } = this.buildVirtualColumn(propertyName, sqlType);
                columns.push(column);
            }
        }

        return columns;
    }

    private buildIndexes(): string[] {
        const indexes: string[] = [];

        for (const field of this.columnFields) {
            const propertyName = field.getPropertyName();
            const hasForeignKey = this.foreignKeyClauseByPropertyName.has(propertyName);
            const options = field.getOptions<ColumnOptions>();

            if (hasForeignKey) {
                const columnName = snakeCase(propertyName);
                // Use Kysely's CreateIndexBuilder for foreign key indexes
                const indexBuilder = qb.schema.createIndex(`idx_${this.tableName}_${columnName}`).on(this.tableName).column(columnName).ifNotExists();
                indexes.push(`${indexBuilder.compile().sql};`);
                continue;
            }

            if (options.index === true) {
                const sqlType = this.formatSqlType(String(options.type).toUpperCase(), options.length);
                const { index } = this.buildVirtualColumn(propertyName, sqlType);
                indexes.push(index);
            }
        }

        return indexes;
    }

    private buildFullTextSearchFields(): FullTextSearchFieldSpec[] {
        const fullTextSearchFields: FullTextSearchFieldSpec[] = [];

        for (const field of this.columnFields) {
            const options = field.getOptions<ColumnOptions>();
            if (options.fullText !== true) {
                continue;
            }
            fullTextSearchFields.push({
                name: field.getPropertyName(),
                jsonPath: options.fullTextPath,
            });
        }

        return fullTextSearchFields;
    }

    private buildVirtualColumn(propertyName: string, sqlType: string): { column: string; index: string } {
        const columnName = snakeCase(propertyName);
        const column = `${columnName} ${sqlType} GENERATED ALWAYS AS (json_extract(data, '$.${propertyName}')) VIRTUAL`;
        // Use Kysely's CreateIndexBuilder for virtual column indexes
        const indexBuilder = qb.schema.createIndex(`idx_${this.tableName}_${columnName}`).on(this.tableName).column(columnName).ifNotExists();
        const index = `${indexBuilder.compile().sql};`;
        return { column, index };
    }
}
