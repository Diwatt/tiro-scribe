import type { EntityClass } from '@/Database/Type';
import { Encounter } from './Encounter';
import { Patient } from './Patient';
import { ProsodyMetrics } from './ProsodyMetrics';
import { QueueItem } from './QueueItem';
import { Therapist } from './Therapist';
import { Transcription } from './Transcription';

/**
 * Single source of truth: table name + entity class (order: parents before dependents).
 * Drives ENTITY_CLASSES and Kysely DatabaseSchema. Add new entities here when you create them.
 * Raw sensor: Transcription (what/when/who), ProsodyMetrics (how – pitch/jitter via segmentId). Encounter ↔ Patient join on encounterId.
 */
export const ENTITY_TABLES = [
    ['therapists', Therapist],
    ['encounters', Encounter],
    ['patients', Patient],
    ['queue_items', QueueItem],
    ['transcriptions', Transcription],
    ['prosody_metrics', ProsodyMetrics],
] as const satisfies readonly (readonly [string, EntityClass])[];

/** Entity classes for schema sync; derived from ENTITY_TABLES. */
export const ENTITY_CLASSES: EntityClass[] = ENTITY_TABLES.map(([, Entity]) => Entity);

export { Encounter, Patient, ProsodyMetrics, QueueItem, Therapist, Transcription };
export { DetectedSpeakerProfile, EncounterStatus, EntityType, PipelineStage, QueueItemStatus } from './Type';
export { Utterance } from './Transcription';
export { VoiceFrame } from './ProsodyMetrics';
