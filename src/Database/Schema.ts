/**
 * WatermelonDB schema definition
 *
 * Collects table schemas from all Model classes
 * This schema is used to initialize the WatermelonDB database
 */

import {appSchema} from '@nozbe/watermelondb';
import {QueueItemSchema} from '@Model/QueueItem';

// TODO: Import other model schemas when models are created
// import { EncounterSchema } from '@Model/Encounter';
// import { RecordingSchema } from '@Model/Recording';
// import { SyncQueueSchema } from '@Model/SyncQueue';

export const schema = appSchema({
    version: 1,
    tables: [
        // TODO: Add other table schemas when models are created
        // EncounterSchema,
        // RecordingSchema,
        // SyncQueueSchema,
        QueueItemSchema,
    ],
});
