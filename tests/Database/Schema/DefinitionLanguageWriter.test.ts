/**
 * DefinitionLanguageWriter tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: DefinitionLanguageWriter. Kysely instance is mocked (executeQuery).
 */

import { DefinitionLanguageWriter } from '@/Database/Schema/DefinitionLanguageWriter';
import { TableDefinition } from '@/Database/Schema/TableDefinition';
import { AppLogger } from '@/Service/Logger';
import { DatabaseException } from '@/Exception';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '@/Database/Type';
import { describe, it, expect, vi } from 'vitest';

function createMockDb(execute?: (sql: string, params?: readonly unknown[]) => Promise<{ rows?: unknown[] } | undefined>) {
    // minimal Kysely-like stub with executeQuery
    const wrapped = execute as any;
    const db: any = {
        executeQuery: async (query: { sql: string; parameters: readonly unknown[] }) => {
            const sql = query.sql;
            const params = query.parameters;
            if (wrapped) {
                return wrapped(sql, params);
            }
            return { rows: [] };
        },
    };
    return db as unknown as Kysely<DatabaseSchema>;
}

function createMinimalDefinition(overrides: Partial<{
    tableName: string;
    primaryKeyColumnName: string;
    columns: string[];
    indexes: string[];
    fullTextSearchFields: readonly { name: string; jsonPath?: string }[];
}> = {}): TableDefinition {
    return new TableDefinition(
        overrides.tableName ?? 'items',
        overrides.primaryKeyColumnName ?? 'uuid',
        overrides.columns ?? ['uuid VARCHAR(36) PRIMARY KEY', 'data TEXT NOT NULL'],
        overrides.indexes ?? [],
        overrides.fullTextSearchFields ?? [],
    );
}

/** Returns PRAGMA table_info-style rows so migrateMissingColumns skips ALTER TABLE. */
function pragmaRowsForDefinition(definition: TableDefinition): { name: string }[] {
    return definition.columns.map((line) => ({ name: line.trim().split(/\s+/)[0] }));
}

describe('DefinitionLanguageWriter', () => {
    describe('Z — Zero (empty / minimal)', () => {
        it('write with no indexes and no fullTextSearchFields executes CREATE TABLE then PRAGMA (migration check)', async () => {
            const definition = createMinimalDefinition({ indexes: [], fullTextSearchFields: [] });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                if (sql.includes('PRAGMA table_info')) {
                    return { rows: pragmaRowsForDefinition(definition) };
                }
                return Promise.resolve({ rows: [] });
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            expect(executed).toHaveLength(2);
            expect(executed[0]).toContain('CREATE TABLE IF NOT EXISTS items');
            expect(executed[0]).toContain('uuid VARCHAR(36) PRIMARY KEY');
            expect(executed[0]).toContain('data TEXT NOT NULL');
            expect(executed[1]).toContain('PRAGMA table_info');
        });

        it('write with empty columns array produces valid CREATE TABLE', async () => {
            const definition = createMinimalDefinition({ columns: [] });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                if (sql.includes('PRAGMA table_info')) return { rows: pragmaRowsForDefinition(definition) };
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            expect(executed[0]).toMatch(/CREATE TABLE IF NOT EXISTS items\s*\(\s*\)/);
        });
    });

    describe('O — One (single index or single FTS field)', () => {
        it('write executes CREATE TABLE then PRAGMA then one index statement when definition has one index', async () => {
            const definition = createMinimalDefinition({
                indexes: ['CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);'],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                if (sql.includes('PRAGMA table_info')) return { rows: pragmaRowsForDefinition(definition) };
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            expect(executed).toHaveLength(3);
            expect(executed[0]).toContain('CREATE TABLE');
            expect(executed[1]).toContain('PRAGMA table_info');
            expect(executed[2]).toContain('CREATE INDEX');
            expect(executed[2]).toContain('idx_items_created_at');
        });

        it('write with one fullTextSearchField executes CREATE TABLE, PRAGMA, indexes, FTS virtual table and three triggers', async () => {
            const definition = createMinimalDefinition({
                fullTextSearchFields: [{ name: 'transcript', jsonPath: '$.text' }],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                if (sql.includes('PRAGMA table_info')) return { rows: pragmaRowsForDefinition(definition) };
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            expect(executed.length).toBeGreaterThanOrEqual(5);
            expect(executed[0]).toContain('CREATE TABLE');
            const ftsCreate = executed.find((s) => s.includes('VIRTUAL TABLE') && s.includes('fts5'));
            expect(ftsCreate).toBeDefined();
            expect(ftsCreate).toContain('items_fts');
            expect(ftsCreate).toContain('content_transcript');
            const insertTrigger = executed.find((s) => s.includes('AFTER INSERT'));
            expect(insertTrigger).toBeDefined();
        });
    });

    describe('M — Many (multiple indexes, multiple FTS fields)', () => {
        it('write executes each index in order after CREATE TABLE and PRAGMA', async () => {
            const definition = createMinimalDefinition({
                indexes: [
                    'CREATE INDEX IF NOT EXISTS idx_items_a ON items(a);',
                    'CREATE INDEX IF NOT EXISTS idx_items_b ON items(b);',
                ],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                if (sql.includes('PRAGMA table_info')) return { rows: pragmaRowsForDefinition(definition) };
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            expect(executed).toHaveLength(4);
            expect(executed[2]).toContain('idx_items_a');
            expect(executed[3]).toContain('idx_items_b');
        });

        it('write with multiple fullTextSearchFields creates FTS table with all content columns', async () => {
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            const definition = createMinimalDefinition({
                tableName: 'encounters',
                primaryKeyColumnName: 'uuid',
                fullTextSearchFields: [
                    { name: 'transcript', jsonPath: '$.text' },
                    { name: 'notes', jsonPath: '$.body' },
                ],
            });
            await writer.write(definition);
            const ftsCreate = executed.find((s) => s.includes('fts5'));
            expect(ftsCreate).toContain('content_transcript');
            expect(ftsCreate).toContain('content_notes');
            expect(ftsCreate).toContain('encounters_fts');
        });
    });

    describe('B — Boundary', () => {
        it('write with tableName and primaryKeyColumnName containing underscores preserves them in SQL', async () => {
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            const definition = createMinimalDefinition({
                tableName: 'queue_items',
                primaryKeyColumnName: 'uuid',
            });
            await writer.write(definition);
            expect(executed[0]).toContain('queue_items');
        });

        it('write with fullTextSearchField without jsonPath uses simple json_extract in trigger', async () => {
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            const definition = createMinimalDefinition({
                fullTextSearchFields: [{ name: 'rawContent' }],
            });
            await writer.write(definition);
            const insertTrigger = executed.find((s) => s.includes('AFTER INSERT'));
            expect(insertTrigger).toContain('json_extract(new.data, \'$.rawContent\')');
        });


        it('write with fullTextSearchField with jsonPath containing single quote escapes it in SQL', async () => {
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            const definition = createMinimalDefinition({
                fullTextSearchFields: [{ name: 'transcript', jsonPath: "$.text" }],
            });
            await writer.write(definition);
            const triggerSql = executed.find((s) => s.includes("json_extract(value,"));
            expect(triggerSql).toBeDefined();
            expect(triggerSql).toContain("$.text");
        });

        it('migrateMissingColumns adds missing columns and skips existing ones', async () => {
            const definition = createMinimalDefinition({
                columns: [
                    'uuid VARCHAR(36) PRIMARY KEY',
                    'data TEXT NOT NULL',
                    'extra INTEGER',
                ],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                if (sql.includes('PRAGMA table_info')) {
                    return { rows: [{ name: 'uuid' }, { name: 'data' }] };
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            const alter = executed.find((s) => s.includes('ALTER TABLE')) as string;
            expect(alter).toContain('ADD COLUMN extra INTEGER');
            // ensure only one ALTER (for extra) occurred
            const alterCount = executed.filter((s) => s.includes('ALTER TABLE')).length;
            expect(alterCount).toBe(1);
        });

        it('addColumnOrWarn logs a warning and continues when adding a virtual column fails in dev', async () => {
            // simulate dev environment
            // @ts-expect-error allow setting global for test
            global.__DEV__ = true;
            const definition = createMinimalDefinition({
                columns: [
                    'uuid VARCHAR(36) PRIMARY KEY',
                    'data TEXT NOT NULL',
                    'vcol TEXT GENERATED ALWAYS AS (json_extract(data, \"$.x\")) VIRTUAL',
                ],
            });
            const logger = AppLogger.getInstance();
            const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
            const tx = createMockDb(async (sql) => {
                if (sql.startsWith('ALTER TABLE') && sql.includes('vcol')) {
                    throw new Error('virtual not supported');
                }
                if (sql.includes('PRAGMA table_info')) {
                    return { rows: [{ name: 'uuid' }, { name: 'data' }] };
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx, logger);
            await writer.write(definition);
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy.mock.calls[0][0]).toMatch(/ADD COLUMN failed for virtual\/generated column/);
            warnSpy.mockRestore();
            // @ts-expect-error cleanup
            delete global.__DEV__;
        });

        it('ignores duplicate-column errors from ALTER TABLE without warning', async () => {
            const definition = createMinimalDefinition({
                columns: [
                    'uuid VARCHAR(36) PRIMARY KEY',
                    'data TEXT NOT NULL',
                    'extra INTEGER',
                ],
            });
            const logger = AppLogger.getInstance();
            const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
            const tx = createMockDb(async (sql) => {
                if (sql.startsWith('ALTER TABLE') && sql.includes('extra')) {
                    throw new Error('Error code 1: duplicate column name: extra');
                }
                if (sql.includes('PRAGMA table_info')) {
                    // pretend the PRAGMA omitted the column so writer will try to add it
                    return { rows: [{ name: 'uuid' }, { name: 'data' }] };
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx, logger);
            await writer.write(definition);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('FTS triggers include DELETE and UPDATE behaviors with correct key usage', async () => {
            const definition = createMinimalDefinition({
                tableName: 'encounters',
                primaryKeyColumnName: 'uuid',
                fullTextSearchFields: [{ name: 'transcript', jsonPath: '$.text' }],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            const delTrig = executed.find((s) => s.includes('AFTER DELETE')) as string;
            const updTrig = executed.find((s) => s.includes('AFTER UPDATE')) as string;
            expect(delTrig).toContain('DELETE FROM encounters_fts WHERE uuid = old.uuid');
            expect(updTrig).toContain('DELETE FROM encounters_fts WHERE uuid = old.uuid');
            expect(updTrig).toContain('INSERT INTO encounters_fts(uuid, content_transcript) VALUES (new.uuid');
        });

        it('fullTextSearch column names are snake_cased from field names', async () => {
            const definition = createMinimalDefinition({
                tableName: 'docs',
                primaryKeyColumnName: 'id',
                fullTextSearchFields: [{ name: 'camelCaseName' }],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            const ftsCreate = executed.find((s) => s.includes('VIRTUAL TABLE')) as string;
            expect(ftsCreate).toContain('content_camel_case_name');
        });
    });

    describe('I — Interface (transaction contract)', () => {
        it('write calls execute with CREATE TABLE first', async () => {
            const order: number[] = [];
            let callIndex = 0;
            const tx = createMockDb(async (sql) => {
                order.push(callIndex++);
                if (sql.includes('CREATE TABLE')) {
                    expect(order[order.length - 1]).toBe(0);
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(createMinimalDefinition());
            expect(order[0]).toBe(0);
        });

        it('write calls execute for CREATE TABLE, PRAGMA, then once per index', async () => {
            const definition = createMinimalDefinition({
                indexes: ['CREATE INDEX a ON t(a);', 'CREATE INDEX b ON t(b);'],
            });
            const execute = vi.fn(async (sql: string) => {
                if (sql.includes('PRAGMA table_info')) return { rows: pragmaRowsForDefinition(definition) };
                return Promise.resolve();
            });
            const tx = createMockDb(execute);
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            expect(execute).toHaveBeenCalledTimes(4);
            expect(execute).toHaveBeenNthCalledWith(1, expect.stringContaining('CREATE TABLE'), []);
            expect(execute).toHaveBeenNthCalledWith(2, expect.stringContaining('PRAGMA table_info'), []);
            expect(execute).toHaveBeenNthCalledWith(3, 'CREATE INDEX a ON t(a);', []);
            expect(execute).toHaveBeenNthCalledWith(4, 'CREATE INDEX b ON t(b);', []);
        });

        it('constructor stores tx and write uses it', async () => {
            const execute = vi.fn(() => Promise.resolve());
            const tx = createMockDb(execute);
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(createMinimalDefinition());
            expect(execute).toHaveBeenCalled();
        });
    });

    describe('E — Exceptions', () => {
        it('write propagates when execute rejects', async () => {
            const tx = createMockDb(() => Promise.reject(new Error('DB error')));
            const writer = new DefinitionLanguageWriter(tx);
            await expect(writer.write(createMinimalDefinition())).rejects.toThrow('DB error');
        });

        it('write propagates when execute throws synchronously', async () => {
            const tx = createMockDb(() => {
                throw new Error('sync error');
            });
            const writer = new DefinitionLanguageWriter(tx);
            await expect(writer.write(createMinimalDefinition())).rejects.toThrow('sync error');
        });

        it('write with fullTextSearchFields propagates execute rejection from FTS creation', async () => {
            const definition = createMinimalDefinition({
                fullTextSearchFields: [{ name: 'x', jsonPath: '$.y' }],
            });
            let callCount = 0;
            const tx = createMockDb(async (sql) => {
                callCount++;
                if (sql.includes('PRAGMA table_info')) return { rows: pragmaRowsForDefinition(definition) };
                if (callCount === 3 && sql.includes('VIRTUAL TABLE')) {
                    return Promise.reject(new Error('FTS create failed'));
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await expect(writer.write(definition)).rejects.toThrow('FTS create failed');
        });
    });

    describe('Additional behaviors', () => {
        it('drops existing FTS triggers before recreating them', async () => {
            const definition = createMinimalDefinition({
                fullTextSearchFields: [{ name: 'transcript', jsonPath: '$.text' }],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            const drops = executed.filter((s) => s.includes('DROP TRIGGER IF EXISTS'));
            expect(drops).toHaveLength(3);
            expect(drops[0]).toContain('items_ai');
            expect(drops[1]).toContain('items_au');
            expect(drops[2]).toContain('items_ad');
        });

        it('builds group_concat extractor when jsonPath is provided for array data', async () => {
            const definition = createMinimalDefinition({
                fullTextSearchFields: [{ name: 'tags', jsonPath: "$.labels[*]" }],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            const insertTrigger = executed.find((s) => s.includes('AFTER INSERT')) as string;
            expect(insertTrigger).toContain("group_concat(json_extract(value, '$.labels[*]'), ' ')");
        });

        it('ensures indexes are executed after migrations', async () => {
            const definition = createMinimalDefinition({
                indexes: ['CREATE INDEX i1 ON items(a);', 'CREATE INDEX i2 ON items(b);'],
                columns: [
                    'uuid VARCHAR(36) PRIMARY KEY',
                    'data TEXT NOT NULL',
                    'added INTEGER',
                ],
            });
            const calls: string[] = [];
            const tx = createMockDb(async (sql) => {
                calls.push(sql);
                if (sql.includes('PRAGMA table_info')) {
                    return { rows: [{ name: 'uuid' }, { name: 'data' }] };
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            const firstIndexPos = calls.findIndex((s) => s.startsWith('CREATE INDEX i1'));
            const alterPos = calls.findIndex((s) => s.startsWith('ALTER TABLE'));
            expect(alterPos).toBeGreaterThan(-1);
            expect(firstIndexPos).toBeGreaterThan(alterPos);
        });

        it('does not warn for non-virtual column add failures and rethrows', async () => {
            // @ts-expect-error allow setting global for test
            global.__DEV__ = true;
            const definition = createMinimalDefinition({
                columns: [
                    'uuid VARCHAR(36) PRIMARY KEY',
                    'data TEXT NOT NULL',
                    'plain INTEGER',
                ],
            });
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const tx = createMockDb(async (sql) => {
                if (sql.startsWith('ALTER TABLE') && sql.includes('plain')) {
                    throw new Error('cannot add');
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await expect(writer.write(definition)).rejects.toThrow('cannot add');
            expect(warnSpy).not.toHaveBeenCalled();
            warnSpy.mockRestore();
            // @ts-expect-error cleanup
            delete global.__DEV__;
        });

        it('handles PRAGMA returning object with rows undefined by treating as empty', async () => {
            const definition = createMinimalDefinition({
                columns: [
                    'uuid VARCHAR(36) PRIMARY KEY',
                    'data TEXT NOT NULL',
                    'extra INTEGER',
                ],
            });
            const executed: string[] = [];
            const tx = createMockDb(async (sql) => {
                executed.push(sql);
                if (sql.includes('PRAGMA table_info')) {
                    return {}; // rows undefined -> treated as empty
                }
                return Promise.resolve();
            });
            const writer = new DefinitionLanguageWriter(tx);
            await writer.write(definition);
            const alters = executed.filter((s) => s.startsWith('ALTER TABLE'));
            expect(alters).toHaveLength(3);
            expect(alters[0]).toContain('uuid VARCHAR(36) PRIMARY KEY');
            expect(alters[1]).toContain('data TEXT NOT NULL');
            expect(alters[2]).toContain('extra INTEGER');
        });
    });
});
