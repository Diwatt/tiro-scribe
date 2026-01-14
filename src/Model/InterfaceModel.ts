/**
 * Interface defining the contract for WatermelonDB models
 * Models must provide table name and schema specification as static properties
 */

import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';

/**
 * Contract interface for WatermelonDB models
 * Defines what each model class must provide: table name and schema specification
 * These are static properties accessible from the class constructor
 */
export interface InterfaceModel {
    /**
     * The database table name (static property)
     */
    readonly tableName: string;

    /**
     * The schema specification (columns definition) (static property)
     */
    readonly schemaSpec: TableSchemaSpec;
}
