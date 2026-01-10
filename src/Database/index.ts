/**
 * WatermelonDB database initialization
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './Schema';

// Create SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  // migrations
  // (optional) migrations: migrations,
  // (optional) dbName: 'tiro_scribe',
  // (optional) jsi: true, // Use JSI for better performance
});

// Create database instance
export const database = new Database({
  adapter,
  modelClasses: [
    // TODO: Import and add model classes
    // Session,
    // Recording,
    // SyncQueue,
  ],
});
