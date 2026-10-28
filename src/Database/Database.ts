/**
 * Database: MikroORM singleton over the expo-sqlite connection (kysely-expo dialect).
 * initialize() opens the ORM, syncs the schema (additive) and caches the instance.
 */

import { MikroORM, SqliteDriver } from '@mikro-orm/sql';
import type { Options } from '@mikro-orm/core';
import type { Dialect } from 'kysely';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { ExpoDialect } from 'kysely-expo';
import { AppConfig } from '@/Core/AppConfig';
import { Container } from '@/Core/Container';
import { DatabaseException } from '@/Exception';

export class Database {
    private static readonly errorCodeNotInitialized = 'DATABASE_NOT_INITIALIZED';

    private static instance: Database | null = null;

    private constructor(private readonly orm: InstanceType<typeof MikroORM>) {}

    /** Idempotent. The caller supplies the entity list (production: ENTITY_CLASSES from @/Entity). */
    public static async initialize(options: { dialect?: Dialect; entities: Options['entities'] }): Promise<Database> {
        if (Database.instance != null) {
            return Database.instance;
        }

        const appConfig = Container.get(AppConfig);
        const orm = await MikroORM.init({
            driver: SqliteDriver,
            entities: options.entities,
            dbName: appConfig.databaseName,
            driverOptions: options.dialect ?? new ExpoDialect({ database: appConfig.databaseName }),
            // app-wide singleton EM (no request scoping in a local-first mobile app)
            allowGlobalContext: true,
        });
        await orm.schema.update();

        Database.instance = new Database(orm);
        return Database.instance;
    }

    public static getInstance(): Database {
        if (Database.instance == null) {
            throw new DatabaseException(
                'Database not initialized. Call Database.initialize() before using repositories.',
                Database.errorCodeNotInitialized,
            );
        }

        return Database.instance;
    }

    /** EntityManager: `getRepository(Therapist)` infers TherapistRepository automatically. */
    public static getEntityManager() {
        return Database.getInstance().orm.em;
    }

    /** Dev helper: deletes the SQLite file and clears the singleton. */
    public static async reset(): Promise<void> {
        const appConfig = Container.get(AppConfig);
        await deleteDatabaseAsync(appConfig.databaseName);
        Database.instance = null;
    }

    public static async close(): Promise<void> {
        if (Database.instance != null) {
            await Database.instance.orm.close(true);
            Database.instance = null;
        }
    }
}
