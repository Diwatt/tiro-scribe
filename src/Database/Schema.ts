/**
 * WatermelonDB schema definition
 * 
 * This schema defines the database structure for offline-first data storage.
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'sessions',
      columns: [
        { name: 'therapist_id', type: 'string', isIndexed: true },
        { name: 'start_date', type: 'number' },
        { name: 'end_date', type: 'number', isOptional: true },
        { name: 'status', type: 'string' }, // 'active', 'completed', 'synced'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'recordings',
      columns: [
        { name: 'session_id', type: 'string', isIndexed: true },
        { name: 'biocode', type: 'string', isIndexed: true },
        { name: 'clean_transcript', type: 'string' },
        { name: 'raw_audio_path', type: 'string' },
        { name: 'confidence', type: 'number' },
        { name: 'processed_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'payload', type: 'string' }, // JSON string of ProcessingPayload
        { name: 'retry_count', type: 'number' },
        { name: 'last_attempt', type: 'number', isOptional: true },
        { name: 'status', type: 'string' }, // 'pending', 'syncing', 'completed', 'failed'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
