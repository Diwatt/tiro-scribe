/**
 * Kysely query builder with ExpoSQLite driver.
 * Uses ExpoDialect from kysely-expo for direct execution.
 */

import { Kysely } from 'kysely';
import { ExpoDialect } from 'kysely-expo';
import { AppConfig } from '@/Core/AppConfig';
import { Container } from '@/Core/Container';
import type { DatabaseSchema } from '@/Database/Type';

// QueryBuilder class extending Kysely
export class QueryBuilder extends Kysely<DatabaseSchema> {
    public constructor(config: AppConfig) {
        super({
            dialect: new ExpoDialect({
                database: config.databaseName,
            }),
        });
    }
}

// Register the QueryBuilder instance with the Container for dependency injection
Container.register(QueryBuilder, () => new QueryBuilder(Container.get(AppConfig)));
