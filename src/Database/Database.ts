/**
 * Database: SQLite connection and schema sync (singleton).
 * Use Database.initialize() (or initialize(entityClasses) for DI) to create tables.
 * Schema sync on initialize is additive only (create missing tables/columns); see DefinitionLanguageWriter.
 */

// FileSystem is imported statically since dynamic imports are no longer
// desired by the user. We cast the module when accessing documentDirectory to
// satisfy TypeScript.
import { deleteDatabaseAsync } from 'expo-sqlite';
import { appConfig } from '@/Config/AppConfig'; // used by reset/delete logic
import { AppLogger } from '@/Service/Logger';
import { EntityMetadata } from '@/Database/Decorator';
import { DefinitionBuilder } from '@/Database/Schema/DefinitionBuilder';
import { DefinitionLanguageWriter } from '@/Database/Schema/DefinitionLanguageWriter';
import type { EntityClass } from '@/Database/Type';
import { ENTITY_CLASSES } from '@/Entity';
import { DatabaseException } from '@/Exception';
import { qb } from './Kysely';


/**
 * Singleton: one SQLite connection and schema sync. Uses ENTITY_CLASSES from @/Entity by default; override via initialize(entityClasses).
 */
export class Database {
    private static instance: Database | null = null;

    private constructor() {}

    private static readonly NOT_INITIALIZED_MESSAGE = 'Database not initialized. Call Database.initialize() before using repositories.';
    private static readonly ERROR_CODE_NOT_INITIALIZED = 'DATABASE_NOT_INITIALIZED';

    /**
     * Initializes the database (idempotent). Uses default entity list from @/Entity when omitted.
     * Must be called before any repository usage.
     * Async so not in constructor: JS/TS constructors cannot be async (open + transaction use await).
     */
    public static async initialize(entityClasses: EntityClass[] = ENTITY_CLASSES): Promise<void> {
        if (Database.instance != null) {
            return;
        }

        const db = new Database();
        await db.openAndSync(entityClasses);
        Database.instance = db;
    }

    /**
     * Returns the Kysely instance for direct database operations.
     * Throws if initialize() has not been called.
     */
    public static getConnection() {
        if (Database.instance == null) {
            throw new DatabaseException(
                Database.NOT_INITIALIZED_MESSAGE,
                Database.ERROR_CODE_NOT_INITIALIZED,
            );
        }
        return qb;
    }

    /**
     * Development helper: Deletes the underlying SQLite file and clears the
     * singleton instance so that the next call to `initialize` starts with a
     * fresh database. This is only called from __DEV__ code – production apps
     * should never invoke this method.
     */
    public static async reset(): Promise<void> {
        // log before deleting so tests and debugging can see what file is being
        // removed; matches expectation in Database.test.ts
        AppLogger.getInstance().info('[Database] resetting database at', {
            path: appConfig.databaseName,
        });

        await deleteDatabaseAsync(appConfig.databaseName);
        Database.instance = null;
    }

    private async openAndSync(entityClasses: EntityClass[]): Promise<void> {
        // Use Kysely transaction for schema creation
        await qb.transaction().execute(async (trx) => {
            const writer = new DefinitionLanguageWriter(trx);
            for (const EntityCls of entityClasses) {
                const definition = new DefinitionBuilder(EntityMetadata.for(EntityCls)).build();
                await writer.write(definition);
            }
        });
    }
}
