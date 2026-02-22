/**
 * Real Kysely instance backed by in-memory SQLite (better-sqlite3).
 * Replaces the previous hand-rolled mock with actual SQL execution.
 * Tests get real SQL compilation AND execution — no Kysely mocking.
 */

import BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

const sqliteDb = new BetterSqlite3(':memory:');

export const testKysely = new Kysely<Record<string, Record<string, unknown>>>({
    dialect: new SqliteDialect({ database: sqliteDb }),
});

/**
 * Ensures the table schema exists for Repository tests.
 * Mirrors the hybrid storage layout: uuid (PK), data (JSON blob), plus real FK columns.
 */
export function ensureTestTable(
    tableName: string,
    foreignKeyColumns: string[] = [],
): void {
    const fkColumnsDdl = foreignKeyColumns.map((col) => `"${col}" TEXT`).join(', ');
    const columns = [`"uuid" TEXT PRIMARY KEY NOT NULL`, `"data" TEXT NOT NULL`, fkColumnsDdl].filter(Boolean).join(', ');
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`);
}

/**
 * Deletes all rows from the given table. Keeps the schema intact.
 * Call in beforeEach to get a clean slate without destroying the Kysely connection.
 */
export function clearTestTable(tableName: string): void {
    try {
        sqliteDb.exec(`DELETE FROM "${tableName}"`);
    } catch {
        // Table may not exist yet — ignore
    }
}
