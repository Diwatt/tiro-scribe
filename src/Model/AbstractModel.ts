/**
 * AbstractModel - Abstract class for WatermelonDB models
 * Provides base functionality for all models
 * 
 * NOTE: TypeScript does not support abstract static properties.
 * The contract is enforced via the InterfaceModel interface.
 * Subclasses MUST implement static readonly tableName and schemaSpec
 * as defined by the InterfaceModel contract.
 */

import {Model} from '@nozbe/watermelondb';

/**
 * Abstract class for WatermelonDB models
 * 
 * Subclasses MUST implement the InterfaceModel contract:
 * - static readonly tableName: string
 * - static readonly schemaSpec: TableSchemaSpec
 * 
 * The contract is enforced via the InterfaceModel interface, not through
 * abstract properties (which TypeScript doesn't support for static members).
 */
export abstract class AbstractModel extends Model {
    // Contract is enforced by InterfaceModel interface
    // Subclasses must implement:
    // - static readonly tableName: string
    // - static readonly schemaSpec: TableSchemaSpec
}
