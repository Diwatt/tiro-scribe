/**
 * WatermelonDB database initialization
 * Uses the model contract to extract schema and configure models
 */

import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {appSchema, tableSchema} from '@nozbe/watermelondb';
import type {Model} from '@nozbe/watermelondb';
import type {InterfaceModel} from '@Model/InterfaceModel';

// Import all models - they will be registered automatically
import {QueueItem} from '@Model/QueueItem';
import {Therapist} from '@Model/Therapist';
import {Subject} from '@Model/Subject';
import {Encounter} from '@Model/Encounter';
import {TranscriptionSegment} from '@Model/TranscriptionSegment';

/**
 * Registry of all WatermelonDB models
 * Add new models here to automatically register them
 */
const MODEL_REGISTRY = [
    QueueItem,
    Therapist,
    Subject,
    Encounter,
    TranscriptionSegment,
] as unknown as (typeof Model & InterfaceModel)[];

/**
 * Build schemas from registered models using the contract interface
 * Extracts schemaSpec from each model and configures WatermelonDB static properties
 */
function buildSchemas() {
    const tables = MODEL_REGISTRY.map(ModelClass => {
        // Use the contract interface to extract schema information from static properties
        const modelContract = ModelClass as unknown as InterfaceModel;
        
        // Get schema specification from the contract (static property)
        const schemaSpec = modelContract.schemaSpec;
        
        // Build the table schema
        const schema = tableSchema(schemaSpec);
        
        // Configure WatermelonDB static properties
        (ModelClass as any).table = modelContract.tableName;
        (ModelClass as any).schema = schema;
        
        return schema;
    });
    
    return appSchema({
        version: 1, // Increment for migrations
        tables,
    });
}

// Build schemas from registered models
const schema = buildSchemas();

// Create SQLite adapter
const adapter = new SQLiteAdapter({
    schema,
    // migrations
    // (optional) migrations: migrations,
    // (optional) dbName: 'tiro_scribe',
    // (optional) jsi: true, // Use JSI for better performance
});

// Create database instance with all registered models
export const database = new Database({
    adapter,
    modelClasses: MODEL_REGISTRY as any[],
});
