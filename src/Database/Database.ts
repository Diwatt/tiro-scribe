/**
 * Database: SQLite connection and schema sync (singleton).
 * Use Database.initialize() (or initialize(entityClasses) for DI) then Database.getConnection().
 */

import { open } from '@op-engineering/op-sqlite';
import { AppConfig } from '@/Config';
import { MetadataReader } from '@/Decorator/MetadataReader';
import { DefinitionBuilder } from '@/Database/Schema/DefinitionBuilder';
import type { TransactionLike } from '@/Database/Schema/DefinitionLanguageWriter';
import { DefinitionLanguageWriter } from '@/Database/Schema/DefinitionLanguageWriter';
import type { EntityClass } from '@/Database/Type';
import { ENTITY_CLASSES } from '@/Entity';

/**
 * Singleton: one SQLite connection and schema sync. Uses ENTITY_CLASSES from @/Entity by default; override via initialize(entityClasses).
 */
export class Database {
    private static instance: Database | null = null;

    private connection: ReturnType<typeof open> | null = null;

    private constructor() {}

    private static readonly NOT_INITIALIZED_MESSAGE =
        'Database not initialized. Call Database.initialize() before using repositories.';

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
     * Returns the SQLite connection. Throws if initialize() has not been called.
     */
    public static getConnection(): ReturnType<typeof open> {
        if (Database.instance == null) {
            throw new Error(Database.NOT_INITIALIZED_MESSAGE);
        }
        return Database.instance.getConnection();
    }

    /**
     * Returns the SQLite connection held by this instance.
     */
    public getConnection(): ReturnType<typeof open> {
        if (this.connection == null) {
            throw new Error(Database.NOT_INITIALIZED_MESSAGE);
        }
        return this.connection;
    }

    private async openAndSync(entityClasses: EntityClass[]): Promise<void> {
        this.connection = open({
            name: AppConfig.databaseName,
        });
        await this.connection.transaction(async (tx) => {
            const writer = new DefinitionLanguageWriter(tx as TransactionLike);
            for (const EntityCls of entityClasses) {
                const definition = new DefinitionBuilder(new MetadataReader(EntityCls)).build();
                await writer.write(definition);
            }
        });
    }
}

export { registry } from '@/Database/Registry';
export { AbstractEntity } from '@/Database/AbstractEntity';
