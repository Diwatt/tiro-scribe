/**
 * Physical SQL table shapes (snake_case columns). Source of truth for Kysely typing.
 * Matches the hybrid storage: uuid (PK), data (JSON blob), plus real columns for Foreign Keys.
 */

/** therapists table: no FK columns. */
export interface TherapistsTable {
    uuid: string;
    data: string;
}

/** encounters table: therapist_id FK. */
export interface EncountersTable {
    uuid: string;
    data: string;
    therapist_id: string;
}

/** transcriptions table: encounter_id FK. */
export interface TranscriptionsTable {
    uuid: string;
    data: string;
    encounter_id: string;
}

/** prosody_metrics table: encounter_id FK. */
export interface ProsodyMetricsTable {
    uuid: string;
    data: string;
    encounter_id: string;
}

/** queue_items table: encounter_id FK. */
export interface QueueItemsTable {
    uuid: string;
    data: string;
    encounter_id: string;
}

/** Database schema interface for Kysely (table names → row types). Named to avoid shadowing Database class. */
export interface DatabaseSchema {
    therapists: TherapistsTable;
    encounters: EncountersTable;
    transcriptions: TranscriptionsTable;
    prosody_metrics: ProsodyMetricsTable;
    queue_items: QueueItemsTable;
}
