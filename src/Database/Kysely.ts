/**
 * Kysely query builder (compile-only). Uses DummyDriver + SqliteAdapter; execution is done via op-sqlite.
 */

import {
    DummyDriver,
    Kysely,
    SqliteAdapter,
    SqliteIntrospector,
    SqliteQueryCompiler,
} from 'kysely';
import type { DatabaseSchema } from '@/Database/Schema';

/** Cold Kysely instance: builds SQL only. Use .compile() then execute with Database.getConnection().execute(compiled.sql, compiled.parameters). */
export const qb = new Kysely<DatabaseSchema>({
    dialect: {
        createAdapter: () => new SqliteAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (db) => new SqliteIntrospector(db),
        createQueryCompiler: () => new SqliteQueryCompiler(),
    },
});
