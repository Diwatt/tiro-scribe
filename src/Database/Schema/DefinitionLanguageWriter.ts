/**
 * Writes a TableDefinition to SQLite: CREATE TABLE, Smart Migrations (ADD COLUMN), CREATE INDEX, FTS table + triggers.
 * Single responsibility: definition → Data Definition Language execution (no entity metadata).
 */

import snakeCase from 'lodash/snakeCase';
import { AppLogger } from '@/Service/Logger';
import type { TableDefinition } from './TableDefinition';

export interface TransactionLike {
    execute(sql: string, params?: unknown[]): Promise<unknown>;
}

/** Row shape returned by PRAGMA table_info(table). Keys match SQLite (e.g. "name"). */
type TableInfoRow = Record<string, unknown> & { name?: string };

/** Executes schema SQL (Data Definition Language: CREATE TABLE, ADD COLUMN for missing columns, CREATE INDEX, full-text search table, triggers). */
export class DefinitionLanguageWriter {
    private readonly tx: TransactionLike;

    public constructor(tx: TransactionLike) {
        this.tx = tx;
    }

    /** Runs DDL for the given definition (CREATE TABLE, migrate missing columns, indexes, full-text search table and triggers). */
    public async write(definition: TableDefinition): Promise<void> {
        const createTableSql = `CREATE TABLE IF NOT EXISTS ${definition.tableName} (\n  ${definition.columns.join(',\n  ')}\n);`;
        await this.tx.execute(createTableSql);

        await this.migrateMissingColumns(definition);

        for (const idx of definition.indexes) {
            await this.tx.execute(idx);
        }

        if (definition.fullTextSearchFields.length > 0) {
            await this.writeFullTextSearchTable(definition);
        }
    }

    /**
     * Smart migration: add any columns present in the definition but missing in the existing table.
     * Parses column names from definition DDL (first token). For virtual columns, ADD COLUMN may fail on older SQLite; errors are logged and skipped.
     */
    private async migrateMissingColumns(definition: TableDefinition): Promise<void> {
        const result = await this.tx.execute(`PRAGMA table_info(${definition.tableName})`) as { rows?: TableInfoRow[] };
        const rows = result?.rows ?? [];
        const existingNames = new Set(rows.map((r) => String((r as { name?: string }).name ?? '')));

        const definitionColumnNames = definition.columns.map((line) => line.trim().split(/\s+/)[0]);
        for (let i = 0; i < definition.columns.length; i++) {
            const columnName = definitionColumnNames[i];
            const columnDdl = definition.columns[i];
            if (existingNames.has(columnName)) {
                continue;
            }
            const added = await this.addColumnOrWarn(definition.tableName, columnName, columnDdl);
            if (added) {
                existingNames.add(columnName);
            }
        }
    }

    private async addColumnOrWarn(tableName: string, columnName: string, columnDdl: string): Promise<boolean> {
        try {
            await this.tx.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnDdl}`);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const isVirtual = columnDdl.includes('GENERATED ALWAYS') || columnDdl.includes('VIRTUAL');
            if (isVirtual && typeof __DEV__ !== 'undefined' && __DEV__) {
                AppLogger.getInstance().warn(
                    `[DefinitionLanguageWriter] ADD COLUMN failed for virtual column "${columnName}" (older SQLite may not support it): ${message}`,
                );
                return false;
            }
            throw err;
        }
    }

    /** Builds the SQL expression that extracts content from a JSON field for full-text indexing. */
    private buildFullTextSearchExtractorExpression(fieldName: string, jsonPath?: string): string {
        if (jsonPath != null && jsonPath !== '') {
            return `(SELECT group_concat(json_extract(value, '${jsonPath.replace(/'/g, "''")}'), ' ') FROM json_each(json_extract(new.data, '$.${fieldName}')))`;
        }
        return `json_extract(new.data, '$.${fieldName}')`;
    }

    private async writeFullTextSearchTable(definition: TableDefinition): Promise<void> {
        const { tableName, primaryKeyColumnName, fullTextSearchFields } = definition;
        const fullTextSearchTable = `${tableName}_fts`;
        const fullTextSearchColumns = fullTextSearchFields.map((f) => `content_${snakeCase(f.name)}`).join(', ');
        await this.tx.execute(`CREATE VIRTUAL TABLE IF NOT EXISTS ${fullTextSearchTable} USING fts5(${primaryKeyColumnName} UNINDEXED, ${fullTextSearchColumns});`);

        const extractors = fullTextSearchFields.map((f) => this.buildFullTextSearchExtractorExpression(f.name, f.jsonPath)).join(', ');
        const targetCols = [primaryKeyColumnName, ...fullTextSearchFields.map((f) => `content_${snakeCase(f.name)}`)].join(', ');

        await this.tx.execute(`DROP TRIGGER IF EXISTS ${tableName}_ai`);
        await this.tx.execute(`DROP TRIGGER IF EXISTS ${tableName}_au`);
        await this.tx.execute(`DROP TRIGGER IF EXISTS ${tableName}_ad`);

        await this.tx.execute(`
            CREATE TRIGGER ${tableName}_ai AFTER INSERT ON ${tableName} BEGIN
                INSERT INTO ${fullTextSearchTable}(${targetCols}) VALUES (new.${primaryKeyColumnName}, ${extractors});
            END;
        `);
        await this.tx.execute(`
            CREATE TRIGGER ${tableName}_au AFTER UPDATE ON ${tableName} BEGIN
                DELETE FROM ${fullTextSearchTable} WHERE ${primaryKeyColumnName} = old.${primaryKeyColumnName};
                INSERT INTO ${fullTextSearchTable}(${targetCols}) VALUES (new.${primaryKeyColumnName}, ${extractors});
            END;
        `);
        await this.tx.execute(`
            CREATE TRIGGER ${tableName}_ad AFTER DELETE ON ${tableName} BEGIN
                DELETE FROM ${fullTextSearchTable} WHERE ${primaryKeyColumnName} = old.${primaryKeyColumnName};
            END;
        `);
    }
}
