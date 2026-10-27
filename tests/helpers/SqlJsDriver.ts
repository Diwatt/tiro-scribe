// tests/helpers/SqlJsDriver.ts
import { CompiledQuery } from 'kysely';
import type { DatabaseConnection, Driver, QueryResult, TransactionSettings } from 'kysely';
import type { Database, SqlJsStatic, SqlValue } from 'sql.js';

/** Single-connection Kysely driver over an in-memory sql.js (WASM SQLite) database. */
export class SqlJsDriver implements Driver, DatabaseConnection {
    private database: Database | undefined;
    private readonly engine: SqlJsStatic;

    public constructor(engine: SqlJsStatic) {
        this.engine = engine;
        this.database = new engine.Database();
    }

    public async acquireConnection(): Promise<DatabaseConnection> {
        return this;
    }

    public async beginTransaction(_connection: DatabaseConnection, _settings: TransactionSettings): Promise<void> {
        this.requireDatabase().run('BEGIN');
    }

    public async commitTransaction(_connection: DatabaseConnection): Promise<void> {
        this.requireDatabase().run('COMMIT');
    }

    public async destroy(): Promise<void> {
        this.database?.close();
        this.database = undefined;
    }

    public async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
        const database = this.requireDatabase();
        const parameters = (compiledQuery.parameters ?? []) as unknown as SqlValue[];
        const results = database.exec(compiledQuery.sql, parameters);
        const rows = results.flatMap((result) => result.values.map((values) => this.rowFromValues(result.columns, values)));

        return { rows: rows as R[], numAffectedRows: BigInt(database.getRowsModified()) };
    }

    public async init(): Promise<void> {}

    public async releaseConnection(_connection: DatabaseConnection): Promise<void> {}

    public async rollbackTransaction(_connection: DatabaseConnection): Promise<void> {
        this.requireDatabase().run('ROLLBACK');
    }

    public async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
        throw new Error('SqlJsDriver does not support streaming queries.');
    }

    private requireDatabase(): Database {
        if (this.database === undefined) {
            throw new Error('SqlJsDriver has been destroyed.');
        }
        return this.database;
    }

    private rowFromValues(columns: string[], values: SqlValue[]): Record<string, SqlValue> {
        const row: Record<string, SqlValue> = {};
        columns.forEach((column, index) => {
            row[column] = values[index];
        });
        return row;
    }
}
