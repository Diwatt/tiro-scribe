/**
 * Executor: runs compiled SQL statements against a connection.
 * Single responsibility: execute(stmt) → result. Connection is required (resolve in caller).
 */

import type { DB, QueryResult, Scalar, Transaction } from '@op-engineering/op-sqlite';

export interface CompiledStatement {
    sql: string;
    parameters: readonly unknown[];
}

export class Executor {
    public constructor(private readonly connection: DB | Transaction) {}

    public getConnection(): DB | Transaction {
        return this.connection;
    }

    public async executeQuery(stmt: CompiledStatement): Promise<Record<string, unknown>[]> {
        const result = await this.connection.execute(stmt.sql, stmt.parameters as Scalar[]);
        return this.toRowArray(result);
    }

    public async executeUpdate(stmt: CompiledStatement): Promise<void> {
        await this.connection.execute(stmt.sql, stmt.parameters as Scalar[]);
    }

    /** op-sqlite execute() returns QueryResult with rows. Normalize to row array (guards mocks). */
    private toRowArray(result: unknown): Record<string, unknown>[] {
        const rows = (result as QueryResult).rows;
        return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    }
}
