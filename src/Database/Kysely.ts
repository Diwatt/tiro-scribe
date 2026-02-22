/**
 * Kysely query builder with ExpoSQLite driver.
 * Uses ExpoDialect from kysely-expo for direct execution.
 */

import { Kysely } from 'kysely';
import { ExpoDialect } from 'kysely-expo';
import { appConfig } from '@/Config/AppConfig';
import type { DatabaseSchema } from '@/Database/Type';

/** Warm Kysely instance: builds and executes SQL directly via expo-sqlite. */
export const qb = new Kysely<DatabaseSchema>({
    dialect: new ExpoDialect({
        database: appConfig.databaseName,
    }),
});
