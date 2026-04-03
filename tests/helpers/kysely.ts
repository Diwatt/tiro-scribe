// tests/helpers/kysely.ts
/**
 * Mock QueryBuilder for tests - simple in-memory implementation.
 * Avoids native better-sqlite3 dependency for unit testing.
 * Only implements what Repository actually uses.
 */

import type { QueryBuilder } from '@/Database/QueryBuilder';

export interface MockRow {
    [key: string]: unknown;
}

// In-memory table storage - persists across test file
const tables = new Map<string, MockRow[]>();

function getTable(name: string): MockRow[] {
    if (!tables.has(name)) {
        tables.set(name, []);
    }
    return tables.get(name)!;
}

// Normalize params array (Kysely sometimes wraps in nested array)
function normalizeParams(params: unknown): unknown[] {
    if (Array.isArray(params) && params.length === 1 && Array.isArray(params[0])) {
        return params[0] as unknown[];
    }
    return Array.isArray(params) ? params : [params];
}

// Extract table name from SQL
function extractTableName(sql: string): string {
    const fromMatch = sql.match(/FROM\s+`(\w+)`/i) || sql.match(/FROM\s+"(\w+)"/i) || sql.match(/FROM\s+(\w+)/i);
    const intoMatch = sql.match(/INTO\s+`(\w+)`/i) || sql.match(/INTO\s+"(\w+)"/i) || sql.match(/INTO\s+(\w+)/i);
    const deleteMatch = sql.match(/DELETE\s+FROM\s+`(\w+)`/i) || sql.match(/DELETE\s+FROM\s+"(\w+)"/i) || sql.match(/DELETE\s+FROM\s+(\w+)/i);
    return fromMatch?.[1] || intoMatch?.[1] || deleteMatch?.[1] || 'encounters';
}

// Extract WHERE condition from SQL
function extractWhere(sql: string, params: unknown[]): { column: string; value: unknown } | null {
    const match = sql.match(/WHERE\s+`(\w+)`\s*=\s*\$?\d+/i)
        || sql.match(/WHERE\s+"(\w+)"\s*=\s*\$?\d+/i)
        || sql.match(/WHERE\s+(\w+)\s*=\s*\$?\d+/i);
    if (match && params.length > 0) {
        return { column: match[1], value: params[0] };
    }
    return null;
}

/**
 * Creates a mock QueryBuilder instance.
 * Implements the Kysely QueryBuilder interface with in-memory storage.
 */
export function createMockQueryBuilder(): QueryBuilder {
    // Track the fluent API chain state
    let operation: 'select' | 'insert' | 'update' | 'delete' | null = null;
    let tableName = '';
    let selectCols: string[] = [];
    let whereCol = '';
    let whereVal: unknown = null;
    let orderByCol = '';
    let orderByDir: 'asc' | 'desc' = 'asc';
    let limitVal: number | undefined;
    let offsetVal = 0;
    let insertVals: Record<string, unknown> = {};
    let onConflictCol = '';
    let onConflictDoUpdate = false;
    let onConflictSetVals: Record<string, unknown> = {};
    let updateVals: Record<string, unknown> = {};
    let compiledSql = '';
    let compiledParams: unknown[] = [];

    function reset(): void {
        operation = null;
        tableName = '';
        selectCols = [];
        whereCol = '';
        whereVal = null;
        orderByCol = '';
        orderByDir = 'asc';
        limitVal = undefined;
        offsetVal = 0;
        insertVals = {};
        onConflictCol = '';
        onConflictDoUpdate = false;
        onConflictSetVals = {};
        updateVals = {};
    }

    // Build SQL string from fluent chain
    function buildSql(): void {
        compiledParams = [];

        if (operation === 'select') {
            const cols = selectCols.length > 0 ? selectCols.map(c => `"${c}"`).join(', ') : '*';
            compiledSql = `SELECT ${cols} FROM "${tableName}"`;
            if (whereCol) {
                compiledSql += ` WHERE "${whereCol}" = $1`;
                compiledParams = [whereVal];
            }
            if (orderByCol) {
                compiledSql += ` ORDER BY "${orderByCol}" ${orderByDir.toUpperCase()}`;
            }
            if (limitVal !== undefined) {
                compiledSql += ` LIMIT ${limitVal}`;
            }
            if (offsetVal > 0) {
                compiledSql += ` OFFSET ${offsetVal}`;
            }
        } else if (operation === 'insert') {
            const cols = Object.keys(insertVals);
            const colsStr = cols.map(c => `"${c}"`).join(', ');
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            compiledSql = `INSERT INTO "${tableName}" (${colsStr}) VALUES (${placeholders})`;
            compiledParams = cols.map(c => insertVals[c]);

            if (onConflictDoUpdate && onConflictCol) {
                const setCols = Object.keys(onConflictSetVals);
                const setStr = setCols.map((c, i) => `"${c}" = $${cols.length + i + 1}`).join(', ');
                compiledSql += ` ON CONFLICT ("${onConflictCol}") DO UPDATE SET ${setStr}`;
                compiledParams = [...compiledParams, ...setCols.map(c => onConflictSetVals[c])];
            }
        } else if (operation === 'update') {
            const setCols = Object.keys(updateVals);
            const setStr = setCols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
            compiledSql = `UPDATE "${tableName}" SET ${setStr}`;
            if (whereCol) {
                compiledSql += ` WHERE "${whereCol}" = $1`;
                compiledParams = [whereVal, ...setCols.map(c => updateVals[c])];
            } else {
                compiledParams = setCols.map(c => updateVals[c]);
            }
        } else if (operation === 'delete') {
            compiledSql = `DELETE FROM "${tableName}"`;
            if (whereCol) {
                compiledSql += ` WHERE "${whereCol}" = $1`;
                compiledParams = [whereVal];
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: Record<string, any> = {
        selectFrom: (tbl: string) => {
            reset();
            operation = 'select';
            tableName = tbl;
            return builder;
        },

        insertInto: (tbl: string) => {
            reset();
            operation = 'insert';
            tableName = tbl;
            return builder;
        },

        deleteFrom: (tbl: string) => {
            reset();
            operation = 'delete';
            tableName = tbl;
            return builder;
        },

        update: (_tbl: string) => {
            operation = 'update';
            return builder;
        },

        select: (cols: unknown) => {
            if (Array.isArray(cols)) {
                selectCols = cols.map(c => String(c));
            } else {
                selectCols = [String(cols)];
            }
            return builder;
        },

        where: (condition: unknown) => {
            // Kysely passes sql`column = value` expression objects
            if (condition && typeof condition === 'object') {
                const condObj = condition as Record<string, unknown>;
                // Try to extract column name from the object
                if ('columnName' in condObj) {
                    whereCol = String(condObj.columnName);
                } else if ('expression' in condObj) {
                    const expr = condObj.expression as Record<string, unknown>;
                    if ('columnName' in expr) {
                        whereCol = String(expr.columnName);
                    }
                }
                // Value will be passed separately in params
            }
            return builder;
        },

        whereClause: (col: string, val: unknown) => {
            whereCol = col;
            whereVal = val;
            return builder;
        },

        orderBy: (col: unknown, dir: string) => {
            if (typeof col === 'object' && col !== null) {
                const colObj = col as Record<string, unknown>;
                if ('expression' in colObj) {
                    const expr = colObj.expression as Record<string, unknown>;
                    if ('columnName' in expr) {
                        orderByCol = String(expr.columnName);
                    } else {
                        orderByCol = String(expr);
                    }
                } else {
                    orderByCol = String(col);
                }
            } else {
                orderByCol = String(col);
            }
            orderByDir = dir.toLowerCase() === 'desc' ? 'desc' : 'asc';
            return builder;
        },

        limit: (n: number) => {
            limitVal = n;
            return builder;
        },

        offset: (n: number) => {
            offsetVal = n;
            return builder;
        },

        values: (row: Record<string, unknown>) => {
            insertVals = { ...row };
            return builder;
        },

        set: (vals: Record<string, unknown>) => {
            updateVals = { ...vals };
            return builder;
        },

        onConflict: (cb: (oc: { column: (col: string) => { doUpdateSet: (row: Record<string, unknown>) => typeof builder } }) => void) => {
            cb({
                column: (col: string) => ({
                    doUpdateSet: (row: Record<string, unknown>) => {
                        onConflictCol = col;
                        onConflictDoUpdate = true;
                        onConflictSetVals = { ...row };
                        return builder;
                    },
                }),
            });
            return builder;
        },

        compile: () => {
            buildSql();
            return { sql: compiledSql, parameters: compiledParams };
        },

        execute: async () => {
            buildSql();
            return (builder as unknown as { executeQuery: (c: { sql: string; parameters: unknown[] }) => Promise<{ rows: MockRow[]; changes: number; lastInsertRowid: bigint }> }).executeQuery({ sql: compiledSql, parameters: compiledParams });
        },

        executeQuery: async (compiled: { sql: string; parameters: unknown[] }) => {
            const { sql, parameters } = compiled;
            const upperSql = sql.trim().toUpperCase();
            const flatParams = normalizeParams(parameters);
            const tblName = extractTableName(sql);
            const table = getTable(tblName);

            if (upperSql.startsWith('INSERT')) {
                const newRow: MockRow = {};
                const colsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
                if (colsMatch) {
                    const cols = colsMatch[1].match(/"(\w+)"/g)?.map(c => c.replace(/"/g, '')) || [];
                    cols.forEach((col, i) => {
                        newRow[col] = flatParams[i] ?? null;
                    });
                }

                if (upperSql.includes('ON CONFLICT') && onConflictDoUpdate && onConflictCol) {
                    const pkVal = newRow[onConflictCol];
                    const existingIdx = table.findIndex(r => String(r[onConflictCol]) === String(pkVal));
                    if (existingIdx >= 0) {
                        Object.assign(table[existingIdx], onConflictSetVals);
                        return { rows: [], changes: 1, lastInsertRowid: BigInt(1) };
                    }
                }

                table.push(newRow);
                return { rows: [], changes: 1, lastInsertRowid: BigInt(table.length) };
            }

            if (upperSql.startsWith('DELETE')) {
                if (!upperSql.includes('WHERE')) {
                    const count = table.length;
                    table.length = 0;
                    return { rows: [], changes: count, lastInsertRowid: BigInt(0) };
                }
                const where = extractWhere(sql, flatParams);
                if (where && flatParams.length > 0) {
                    const idx = table.findIndex(r => String(r[where.column]) === String(flatParams[0]));
                    if (idx >= 0) {
                        table.splice(idx, 1);
                        return { rows: [], changes: 1, lastInsertRowid: BigInt(0) };
                    }
                }
                return { rows: [], changes: 0, lastInsertRowid: BigInt(0) };
            }

            if (upperSql.startsWith('UPDATE')) {
                const where = extractWhere(sql, flatParams);
                if (where && flatParams.length > 0) {
                    const idx = table.findIndex(r => String(r[where.column]) === String(flatParams[0]));
                    if (idx >= 0) {
                        const setMatch = sql.match(/SET\s+(.+?)\s*WHERE/i);
                        if (setMatch) {
                            const setCols = setMatch[1].match(/"(\w+)"/g)?.map(c => c.replace(/"/g, '')) || [];
                            setCols.forEach((col, i) => {
                                if (flatParams[1 + i] !== undefined) {
                                    table[idx][col] = flatParams[1 + i];
                                }
                            });
                        }
                        return { rows: [], changes: 1, lastInsertRowid: BigInt(0) };
                    }
                }
                return { rows: [], changes: 0, lastInsertRowid: BigInt(0) };
            }

            if (upperSql.startsWith('SELECT')) {
                let result = [...table];
                const where = extractWhere(sql, flatParams);
                if (where && flatParams.length > 0) {
                    result = result.filter(r => String(r[where.column]) === String(flatParams[0]));
                }
                const orderMatch = sql.match(/ORDER\s+BY\s+"(\w+)"/i);
                if (orderMatch) {
                    const col = orderMatch[1];
                    const isDesc = sql.toUpperCase().includes('DESC');
                    result.sort((a, b) => {
                        const cmp = String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
                        return isDesc ? -cmp : cmp;
                    });
                }
                const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
                if (limitMatch) {
                    result = result.slice(0, parseInt(limitMatch[1], 10));
                }
                const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
                if (offsetMatch) {
                    result = result.slice(parseInt(offsetMatch[1], 10));
                }
                return { rows: result, changes: 0, lastInsertRowid: BigInt(0) };
            }

            if (upperSql.startsWith('CREATE TABLE')) {
                const match = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/i) || sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                if (match && !tables.has(match[1])) {
                    tables.set(match[1], []);
                }
                return { rows: [], changes: 0, lastInsertRowid: BigInt(0) };
            }

            return { rows: [], changes: 0, lastInsertRowid: BigInt(0) };
        },

        transaction: () => ({
            execute: async <T>(fn: (trx: QueryBuilder) => Promise<T>): Promise<T> => {
                return fn(builder as unknown as QueryBuilder);
            },
        }),
    };

    return builder as unknown as QueryBuilder;
}

export async function initializeTestDatabase(): Promise<QueryBuilder> {
    tables.clear();
    return createMockQueryBuilder();
}

export async function createTestKysely(): Promise<QueryBuilder> {
    return initializeTestDatabase();
}

export async function ensureTestTable(
    _db: QueryBuilder,
    tableName: string,
    _schema: Record<string, string>
): Promise<void> {
    if (!tables.has(tableName)) {
        tables.set(tableName, []);
    }
}

export async function clearTestTable(_db: QueryBuilder, tableName: string): Promise<void> {
    tables.set(tableName, []);
}

export async function clearAllTestTables(_db: QueryBuilder, tableNames: string[]): Promise<void> {
    tableNames.forEach(name => tables.set(name, []));
}