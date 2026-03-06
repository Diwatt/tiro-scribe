/**
 * Writes a TableDefinition to SQLite: CREATE TABLE, Smart Migrations (ADD COLUMN), CREATE INDEX, FTS table + triggers.
 * Single responsibility: definition → Data Definition Language execution (no entity metadata).
 *
 * Schema sync is additive only: creates missing tables, adds missing columns and indexes. It does not drop or rename
 * columns, change types, or run versioned migration scripts. For removals or renames, use manual DDL or a migration framework.
 */

import { CompiledQuery, type Kysely } from 'kysely';
import snakeCase from 'lodash/snakeCase';
import type { AppLogger } from '@/Core/AppLogger';
import type { DatabaseSchema } from '@/Database/Type';
import type { TableDefinition } from './TableDefinition';

/** Row shape returned by PRAGMA table_info(table). Keys match SQLite (e.g. "name"). */
type TableInfoRow = Record<string, unknown> & { name?: string };

/** Executes schema SQL (Data Definition Language: CREATE TABLE, ADD COLUMN for missing columns, CREATE INDEX, full-text search table, triggers). */
export class DefinitionLanguageWriter {
    private readonly db: Kysely<DatabaseSchema>;
    private readonly logger: AppLogger;

    public constructor(db: Kysely<DatabaseSchema>, logger: AppLogger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Runs DDL for the given definition (CREATE TABLE, migrate missing columns, indexes, full-text search table and triggers).
     * tableName and columns come from DefinitionBuilder/entity metadata only; do not pass user-controlled input.
     */
    public async write(definition: TableDefinition): Promise<void> {
        const createTableSql = `CREATE TABLE IF NOT EXISTS ${definition.tableName} (\n  ${definition.columns.join(',\n  ')}\n);`;
        await this.executeRaw(createTableSql);

        await this.migrateMissingColumns(definition);

        for (const idx of definition.indexes) {
            await this.executeRaw(idx);
        }

        if (definition.fullTextSearchFields.length > 0) {
            await this.writeFullTextSearchTable(definition);
        }
    }

    /**
     * Smart migration: add any columns present in the definition but missing in the existing table.
     * Column names are parsed as the first token of each DDL line (definition is from entity metadata; format is simple "name TYPE ...").
     * For virtual columns, ADD COLUMN may fail on older SQLite; errors are logged and skipped.
     */

    /**
     * Adds a column. Only virtual/generated columns may have errors caught and logged (e.g. older SQLite);
     * physical columns (e.g. foreign keys) must throw on failure to avoid database corruption.
     */
    private async addColumnOrWarn(tableName: string, columnName: string, columnDdl: string): Promise<boolean> {
        const isVirtualOrGenerated = columnDdl.includes('GENERATED ALWAYS') || columnDdl.includes('VIRTUAL');
        try {
            await this.executeRaw(`ALTER TABLE ${tableName} ADD COLUMN ${columnDdl}`);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);

            // COMMON CASE: column actually already exists despite our PRAGMA check.
            // Older or embedded SQLite builds sometimes omit virtual/generated columns from
            // `PRAGMA table_info` which leads us to try adding a column that the database
            // already has.  ALTER TABLE will fail with "duplicate column name: ..." in
            // that situation; treat it as a no‑op rather than logging a scary warning or
            // rethrowing.
            if (message.toLowerCase().includes('duplicate column name')) {
                return false;
            }

            if (isVirtualOrGenerated) {
                // Virtual/generated columns may not be supported on the device's SQLite
                // version.  Log a warning so the problem is visible in development, but
                // don't block startup.
                this.logger.warn(
                    '[DefinitionLanguageWriter] ADD COLUMN failed for virtual/generated column (older SQLite may not support it)',
                    {
                        tableName,
                        columnName,
                        columnDdl,
                        error: err,
                        errorMessage: message,
                    },
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

    private async executeRaw<T = Record<string, unknown>>(sqlText: string): Promise<{ rows?: T[] }> {
        const result = await this.db.executeQuery(CompiledQuery.raw(sqlText, []));
        return { rows: (result?.rows ?? []) as T[] };
    }

    private async migrateMissingColumns(definition: TableDefinition): Promise<void> {
        const result = await this.executeRaw<TableInfoRow>(`PRAGMA table_info(${definition.tableName})`);
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

    private async writeFullTextSearchTable(definition: TableDefinition): Promise<void> {
        const { tableName, primaryKeyColumnName, fullTextSearchFields } = definition;
        const fullTextSearchTable = `${tableName}_fts`;
        const fullTextSearchColumns = fullTextSearchFields.map((f) => `content_${snakeCase(f.name)}`).join(', ');
        await this.executeRaw(
            `CREATE VIRTUAL TABLE IF NOT EXISTS ${fullTextSearchTable} USING fts5(${primaryKeyColumnName} UNINDEXED, ${fullTextSearchColumns});`,
        );

        const extractors = fullTextSearchFields
            .map((f) => this.buildFullTextSearchExtractorExpression(f.name, f.jsonPath))
            .join(', ');
        const targetCols = [
            primaryKeyColumnName,
            ...fullTextSearchFields.map((f) => `content_${snakeCase(f.name)}`),
        ].join(', ');

        await this.executeRaw(`DROP TRIGGER IF EXISTS ${tableName}_ai`);
        await this.executeRaw(`DROP TRIGGER IF EXISTS ${tableName}_au`);
        await this.executeRaw(`DROP TRIGGER IF EXISTS ${tableName}_ad`);

        await this.executeRaw(`
            CREATE TRIGGER ${tableName}_ai AFTER INSERT ON ${tableName} BEGIN
                INSERT INTO ${fullTextSearchTable}(${targetCols}) VALUES (new.${primaryKeyColumnName}, ${extractors});
            END;
        `);
        await this.executeRaw(`
            CREATE TRIGGER ${tableName}_au AFTER UPDATE ON ${tableName} BEGIN
                DELETE FROM ${fullTextSearchTable} WHERE ${primaryKeyColumnName} = old.${primaryKeyColumnName};
                INSERT INTO ${fullTextSearchTable}(${targetCols}) VALUES (new.${primaryKeyColumnName}, ${extractors});
            END;
        `);
        await this.executeRaw(`
            CREATE TRIGGER ${tableName}_ad AFTER DELETE ON ${tableName} BEGIN
                DELETE FROM ${fullTextSearchTable} WHERE ${primaryKeyColumnName} = old.${primaryKeyColumnName};
            END;
        `);
    }
}
