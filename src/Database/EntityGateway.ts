/**
 * EntityGateway: executes SQL for a single entity table (query, persist, remove).
 * Uses Kysely (compile-only) for persist/remove; connection is injected for execution.
 */

import { sql } from 'kysely';
import { qb } from './Kysely';

export interface CompiledStatement {
    sql: string;
    parameters: readonly unknown[];
}

export interface ForeignKeyColumnRef {
    propertyName: string;
    columnName: string;
}

export interface ConnectionLike {
    execute(sql: string, parameters?: readonly unknown[]): Promise<{ rows?: unknown[] } | undefined>;
}

export class EntityGateway {
    private readonly connection: ConnectionLike;
    private readonly tableName: string;
    private readonly primaryKeyColumnName: string;
    private readonly foreignKeyColumns: readonly ForeignKeyColumnRef[];

    public constructor(
        connection: ConnectionLike,
        tableName: string,
        primaryKeyColumnName: string,
        foreignKeyColumns: readonly ForeignKeyColumnRef[],
    ) {
        this.connection = connection;
        this.tableName = tableName;
        this.primaryKeyColumnName = primaryKeyColumnName;
        this.foreignKeyColumns = foreignKeyColumns;
    }

    public getConnection(): ConnectionLike {

        return this.connection;
    }

    public async executeQuery(stmt: CompiledStatement): Promise<Record<string, unknown>[]> {
        const result = await this.connection.execute(stmt.sql, stmt.parameters);
        const rows = result != null && typeof result === 'object' && Array.isArray(result.rows)
            ? result.rows
            : [];

        return rows as Record<string, unknown>[];
    }


    public async executeUpdate(stmt: CompiledStatement): Promise<void> {
        await this.connection.execute(stmt.sql, stmt.parameters);
    }

    public async persist(row: Record<string, unknown>): Promise<void> {
        const columns = [
            this.primaryKeyColumnName,
            'data',
            ...this.foreignKeyColumns.map((c) => c.columnName),
        ];
        const values = columns.map((col) => row[col]);
        const valueFragments = values.map((v) => sql`${v}`);
        const compiled = sql`
            INSERT OR REPLACE INTO ${sql.raw(this.tableName)} (${sql.raw(columns.join(', '))})
            VALUES (${sql.join(valueFragments, sql.raw(', '))})
        `.compile(qb);
        const stmt = { sql: compiled.sql, parameters: [...compiled.parameters] };

        await this.executeUpdate(stmt);
    }

    public async remove(primaryKey: string): Promise<void> {
        const compiled = sql`
            DELETE FROM ${sql.raw(this.tableName)}
            WHERE ${sql.raw(this.primaryKeyColumnName)} = ${primaryKey}
        `.compile(qb);
        const stmt = { sql: compiled.sql, parameters: [...compiled.parameters] };

        await this.executeUpdate(stmt);
    }
}
