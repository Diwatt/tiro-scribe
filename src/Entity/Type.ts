/**
 * Shared enums and types used across entities.
 *
 * DATETIME CONVENTION (no redundant conversion):
 * - Wall-clock: Dayjs (UTC) everywhere in app. Convert to ISO string only at boundaries (DB write, network/serialization).
 * - Relative (within recording): number in milliseconds from recording start (t=0). Utterance, VoiceFrame, Encounter.totalDuration.
 */

// --- ENUMS ---
export enum EncounterStatus {
    Recording = 'recording',
    Waiting = 'waiting',
    Processing = 'processing',
    Ready = 'ready',
    Archived = 'archived',
}
export enum QueueItemStatus {
    Pending = 'pending',
    Running = 'running',
    Paused = 'paused',
    Completed = 'completed',
    Failed = 'failed',
}
export enum DownloadQueueStatus {
    Pending = 'pending',
    Downloading = 'downloading',
    Paused = 'paused',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled',
}
export enum QueueItemType {
    Download = 'download',
    Processing = 'processing',
}
export enum PipelineStage {
    Waiting = 'waiting',
    Transcribing = 'transcribing',
    Anonymizing = 'anonymizing',
    ToSync = 'to_sync',
}
export enum EntityType {
    Person = 'person',
    Location = 'location',
    FamilyRelation = 'family_relation',
    WorkRelation = 'work_relation',
    Date = 'date',
    Time = 'time',
}

/** Speaker profile detected during the session. */
export class DetectedSpeakerProfile {
    public constructor(
        public label: string,
        public embedding: number[],
        public identifiedParticipantUuid: string | null,
        public displayName: string | null,
    ) {}
}
