// tests/helpers/SqlJsDialect.ts
import { SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely';
import type { Dialect, DialectAdapter, DatabaseIntrospector, Driver, Kysely, QueryCompiler } from 'kysely';
import type { SqlJsStatic } from 'sql.js';
import { SqlJsDriver } from './SqlJsDriver';

/** Kysely dialect over an in-memory sql.js (WASM SQLite) database. */
export class SqlJsDialect implements Dialect {
    private readonly engine: SqlJsStatic;

    public constructor(engine: SqlJsStatic) {
        this.engine = engine;
    }

    public createAdapter(): DialectAdapter {
        return new SqliteAdapter();
    }

    public createDriver(): Driver {
        return new SqlJsDriver(this.engine);
    }

    // biome-ignore lint/suspicious/noExplicitAny: Dialect.createIntrospector receives Kysely<any> by contract
    public createIntrospector(db: Kysely<any>): DatabaseIntrospector {
        return new SqliteIntrospector(db);
    }

    public createQueryCompiler(): QueryCompiler {
        return new SqliteQueryCompiler();
    }
}
