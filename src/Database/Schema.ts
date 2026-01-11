/**
 * WatermelonDB schema definition
 * 
 * Collects table schemas from all Model classes
 * This schema is used to initialize the WatermelonDB database
 */

import { appSchema } from '@nozbe/watermelondb';
import { QueueItemSchema } from '@Model/QueueItem';

// TODO: Import other model schemas when models are created
// import { SessionSchema } from '@Model/Session';
// import { RecordingSchema } from '@Model/Recording';
// import { SyncQueueSchema } from '@Model/SyncQueue';

export const schema = appSchema({
  version: 1,
  tables: [
    // TODO: Add other table schemas when models are created
    // SessionSchema,
    // RecordingSchema,
    // SyncQueueSchema,
    QueueItemSchema,
  ],
});
