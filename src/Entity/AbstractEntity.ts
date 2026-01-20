/**
 * Entity Interface
 * Defines the contract for database entity classes
 */
export interface IEntity<TSchema> {
    /**
     * Convert entity to database schema format
     */
    toDatabase(): TSchema;
}

/**
 * Abstract Entity Base Class
 * Provides common functionality for all database entities
 */
export abstract class AbstractEntity<TSchema> implements IEntity<TSchema> {
    /**
     * Store original schema data for toDatabase() conversion
     * This preserves the original format (e.g., timestamps as numbers)
     */
    protected readonly _schemaData: TSchema;

    constructor(schemaData: TSchema) {
        this._schemaData = schemaData;
    }

    /**
     * Create entity instance from database record
     * This static method is inherited by all entity subclasses
     */
    public static fromDatabase<TEntity extends AbstractEntity<TSchema>, TSchema>(
        this: new (data: TSchema) => TEntity,
        data: TSchema,
    ): TEntity {
        return new this(data);
    }

    /**
     * Convert to plain object for database operations
     * Returns the original schema data, preserving correct types (e.g., timestamps as numbers)
     */
    public toDatabase(): TSchema {
        return this._schemaData;
    }
}
