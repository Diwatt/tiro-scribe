/**
 * Builds a TableDefinition from an entity class by reading @Entity / @Column / @PrimaryKey / @ForeignKey metadata.
 * Single responsibility: entity metadata → definition (no SQL, no I/O).
 * Returns TableDefinition so the DDL writer stays decoupled from entity classes (see TableDefinition JSDoc).
 */

import type { FieldDecorator } from '@/Decorator/FieldDecorator';
import type { MetadataReader } from '@/Decorator/MetadataReader';
import { DatabaseException } from '@/Exception';
import type { EntityClassStatic } from '../AbstractEntity';
import type { ColumnOptions } from '../Column';
import type { ForeignKeyOptions } from '../ForeignKey';
import { OnDeleteAction } from '../ForeignKey';
import snakeCase from 'lodash/snakeCase';
import type { FullTextSearchFieldSpec } from './TableDefinition';
import { TableDefinition } from './TableDefinition';

/** Primary key column descriptor for DDL (name, SQL type, optional length). */
interface PrimaryKeyColumnDef {
    columnName: string;
    type: string;
    length?: number;
}

export class DefinitionBuilder {
    /** SQLite types that accept a length in DDL (e.g. VARCHAR(36)). */
    private static readonly SQLITE_TYPES_WITH_LENGTH = new Set<string>(['VARCHAR', 'CHAR', 'CHARACTER']);

    private readonly tableName: string;
    private readonly primaryKeyPropertyName: string;
    private readonly primaryKeyColumnName: string;
    private readonly primaryKeyColumn: PrimaryKeyColumnDef;
    private readonly columnFields: FieldDecorator[];
    /** Property name → " REFERENCES table(column) ON DELETE action" for columns with @ForeignKey. */
    private readonly foreignKeyClauseByPropertyName: Map<string, string>;

    public constructor(reader: MetadataReader) {
        const entity = reader.getEntity();
        const primaryKeyColumnField = reader.getPrimaryKeyColumn();
        if (entity == null || primaryKeyColumnField == null) {
            throw new DatabaseException('Reader must target an entity class (@Entity and @PrimaryKey).', 'ENTITY_METADATA_REQUIRED', undefined);
        }
        this.tableName = entity.getOption('tableName');
        this.primaryKeyPropertyName = primaryKeyColumnField.getFieldName();
        this.primaryKeyColumnName = snakeCase(this.primaryKeyPropertyName);
        const primaryKeyOptions = primaryKeyColumnField.getOptions<ColumnOptions>();
        const primaryKeyType = String(primaryKeyOptions.type).toUpperCase();
        const primaryKeyLength = primaryKeyOptions.length;
        this.primaryKeyColumn = {
            columnName: this.primaryKeyColumnName,
            type: primaryKeyType,
            length: primaryKeyLength,
        };
        this.columnFields = reader.getFieldsByDecorator('Column').filter((f) => f.getFieldName() !== this.primaryKeyPropertyName);
        this.foreignKeyClauseByPropertyName = this.buildForeignKeyClauses(reader);
    }

    private buildForeignKeyClauses(reader: MetadataReader): Map<string, string> {
        const map = new Map<string, string>();
        const addIfPresent = (propertyName: string): void => {
            const clause = this.getForeignKeyReferencesClause(reader, propertyName);
            if (clause != null) {
                map.set(propertyName, clause);
            }
        };
        addIfPresent(this.primaryKeyPropertyName);
        for (const field of this.columnFields) {
            addIfPresent(field.getFieldName());
        }
        return map;
    }

    private getForeignKeyReferencesClause(reader: MetadataReader, propertyName: string): string | null {
        const decorators = reader.getFieldByProperty(propertyName);
        const foreignKeyDecorator = decorators.find((d) => d.getDecoratorName() === 'ForeignKey');
        if (foreignKeyDecorator == null) {
            return null;
        }
        const options = foreignKeyDecorator.getOptions<ForeignKeyOptions>();
        const targetClass = (typeof options.target === 'function' ? options.target() : options.target) as EntityClassStatic;
        const referencedTable = targetClass?.entityName;
        if (referencedTable == null || typeof referencedTable !== 'string' || referencedTable.trim() === '') {
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

    private formatSqlType(type: string, length?: number): string {
        if (length != null && length > 0 && DefinitionBuilder.SQLITE_TYPES_WITH_LENGTH.has(type)) {
            return `${type}(${length})`;
        }

        return type;
    }

    /**
     * Builds column DDL: primary key, data, then real columns for @ForeignKey fields, then virtual columns for index-only fields.
     * SQLite forbids REFERENCES on virtual columns, so foreign key fields must be real columns.
     */
    private buildColumns(): string[] {
        const columns: string[] = [];
        const primaryKeySqlType = this.formatSqlType(this.primaryKeyColumn.type, this.primaryKeyColumn.length);
        const primaryKeyFk = this.foreignKeyClauseByPropertyName.get(this.primaryKeyPropertyName) ?? '';
        columns.push(`${this.primaryKeyColumn.columnName} ${primaryKeySqlType}${primaryKeyFk} PRIMARY KEY`);
        columns.push('data TEXT NOT NULL');

        for (const field of this.columnFields) {
            const propertyName = field.getFieldName();
            const hasForeignKey = this.foreignKeyClauseByPropertyName.has(propertyName);
            const options = field.getOptions<ColumnOptions>();

            if (hasForeignKey) {
                const sqlType = this.formatSqlType(String(options.type).toUpperCase(), options.length);
                const foreignKeyClause = this.foreignKeyClauseByPropertyName.get(propertyName) ?? '';
                const columnName = snakeCase(propertyName);
                columns.push(`${columnName} ${sqlType}${foreignKeyClause}`);
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
            const propertyName = field.getFieldName();
            const hasForeignKey = this.foreignKeyClauseByPropertyName.has(propertyName);
            const options = field.getOptions<ColumnOptions>();

            if (hasForeignKey) {
                const columnName = snakeCase(propertyName);
                indexes.push(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_${columnName} ON ${this.tableName}(${columnName});`);
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
                name: field.getFieldName(),
                jsonPath: options.fullTextPath,
            });
        }

        return fullTextSearchFields;
    }

    private buildVirtualColumn(propertyName: string, sqlType: string): { column: string; index: string } {
        const columnName = snakeCase(propertyName);
        const column = `${columnName} ${sqlType} GENERATED ALWAYS AS (json_extract(data, '$.${propertyName}')) VIRTUAL`;
        const index = `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_${columnName} ON ${this.tableName}(${columnName});`;
        return { column, index };
    }
}
