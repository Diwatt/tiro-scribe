import type { Options } from '@mikro-orm/core';
import initSqlJs from 'sql.js';
import { MikroORM, SqliteDriver } from '@mikro-orm/sql';
import { SqlJsDialect } from './SqlJsDialect';

/** Fresh in-memory MikroORM instance backed by sql.js (WASM, no native binary). */
export async function createTestOrm(entities: Options['entities']) {
    const engine = await initSqlJs();
    const orm = await MikroORM.init({
        driver: SqliteDriver,
        entities,
        dbName: ':memory:',
        driverOptions: new SqlJsDialect(engine),
        allowGlobalContext: true,
    });
    await orm.schema.create();
    // sql.js does not enforce FKs unless the pragma is on for the connection
    await orm.em.execute('pragma foreign_keys = on');
    return orm;
}
