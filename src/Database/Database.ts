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
import { SqlCipherConnection } from './SqlCipherConnection';

export class Database {
    private static readonly errorCodeNotInitialized = 'DATABASE_NOT_INITIALIZED';
    private static readonly errorCodeKeyUnavailable = 'DATABASE_KEY_UNAVAILABLE';

    private static instance: Database | null = null;
    private static databaseKey: string | null = null;

    private constructor(private readonly orm: InstanceType<typeof MikroORM>) {}

    /**
     * Idempotent. The caller supplies the entity list (production: ENTITY_CLASSES from
     * @/Entity) and the RAM-held dbKey (decrypted keyfile or onboarding bootstrap). A
     * custom dialect (test injection, e.g. SqlJsDialect) bypasses the SQLCipher open
     * path — production always goes through SqlCipherConnection.
     */
    public static async initialize(options: {
        dialect?: Dialect;
        entities: Options['entities'];
        dbKey: string;
    }): Promise<Database> {
        if (Database.instance != null) {
            return Database.instance;
        }

        const appConfig = Container.get(AppConfig);
        const dialect =
            options.dialect ??
            new ExpoDialect({ database: await SqlCipherConnection.open(appConfig.databaseName, options.dbKey) });

        const orm = await MikroORM.init({
            driver: SqliteDriver,
            entities: options.entities,
            dbName: appConfig.databaseName,
            driverOptions: dialect,
            // app-wide singleton EM (no request scoping in a local-first mobile app)
            allowGlobalContext: true,
        });
        await orm.schema.update();

        Database.instance = new Database(orm);
        Database.databaseKey = options.dbKey;
        return Database.instance;
    }

    /** The RAM-held SQLCipher key: needed once more at onboarding finalize to write the keyfile. */
    public static getDatabaseKey(): string {
        if (Database.databaseKey == null) {
            throw new DatabaseException(
                'Database key unavailable. The database is not initialized.',
                Database.errorCodeKeyUnavailable,
            );
        }

        return Database.databaseKey;
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
        Database.databaseKey = null;
    }

    public static async close(): Promise<void> {
        if (Database.instance != null) {
            await Database.instance.orm.close(true);
            Database.instance = null;
        }
        Database.databaseKey = null;
    }
}
