/**
 * Kysely query builder with ExpoSQLite driver.
 * Uses ExpoDialect from kysely-expo for direct execution.
 */

import { Kysely } from 'kysely';
import { ExpoDialect } from 'kysely-expo';
import { AppConfig } from '@/Config/AppConfig';
import { Container } from '@/Container';
import type { DatabaseSchema } from '@/Database/Type';

// Symbol token for Kysely instance registration
export const QueryBuilder = Symbol('Kysely');

// Register the QueryBuilder instance with the Container for dependency injection
Container.register(
    QueryBuilder,
    () =>
        new Kysely<DatabaseSchema>({
            dialect: new ExpoDialect({
                database: Container.get(AppConfig).databaseName,
            }),
        }),
);
