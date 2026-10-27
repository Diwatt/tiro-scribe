// tests/helpers/kysely.ts
/**
 * Real in-memory SQLite for tests: sql.js (WASM, no native binary) behind a
 * minimal Kysely dialect. Every call returns a fresh, isolated database.
 */

import { CompiledQuery, Kysely } from 'kysely';
import initSqlJs from 'sql.js';
import type { DatabaseSchema } from '@/Database/Type';
import { SqlJsDialect } from './SqlJsDialect';

export async function createTestKysely(): Promise<Kysely<DatabaseSchema>> {
    const engine = await initSqlJs();

    return new Kysely<DatabaseSchema>({
        dialect: new SqlJsDialect(engine),
    });
}

export async function initializeTestDatabase(): Promise<Kysely<DatabaseSchema>> {
    return createTestKysely();
}

export async function ensureTestTable(
    db: Kysely<DatabaseSchema>,
    tableName: string,
    schema: Record<string, string>,
): Promise<void> {
    const columns = Object.entries(schema)
        .map(([name, type]) => `"${name}" ${type}`)
        .join(', ');
    await db.executeQuery(CompiledQuery.raw(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`, []));
}

export async function clearTestTable(db: Kysely<DatabaseSchema>, tableName: string): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`DELETE FROM "${tableName}"`, []));
}

export async function clearAllTestTables(db: Kysely<DatabaseSchema>, tableNames: string[]): Promise<void> {
    for (const tableName of tableNames) {
        await clearTestTable(db, tableName);
    }
}

export async function closeTestDatabase(db: Kysely<DatabaseSchema>): Promise<void> {
    await db.destroy();
}
