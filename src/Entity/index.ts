import type { EntityClass } from '@/Database/Type';
import { Encounter } from './Encounter';
import { ProsodyMetrics } from './ProsodyMetrics';
import { QueueItem } from './QueueItem';
import { Therapist } from './Therapist';
import { Transcription } from './Transcription';

/**
 * Single source of truth: table name + entity class (order: parents before dependents).
 * Drives ENTITY_CLASSES and Kysely DatabaseSchema. Add new entities here when you create them.
 */
export const ENTITY_TABLES = [
    ['therapists', Therapist],
    ['encounters', Encounter],
    ['queue_items', QueueItem],
    ['transcriptions', Transcription],
    ['prosody_metrics', ProsodyMetrics],
] as const satisfies readonly (readonly [string, EntityClass])[];

/** Entity classes for schema sync; derived from ENTITY_TABLES. */
export const ENTITY_CLASSES: EntityClass[] = ENTITY_TABLES.map(([, Entity]) => Entity);

export { Encounter, ProsodyMetrics, QueueItem, Therapist, Transcription };
export type {
    AnonymizationResult,
    AnonymizedEntity,
    AudioProcessingResult,
    BiocodeResult,
    DetectedSpeakerProfile,
    ProcessingPayload,
    QueueItemErrorEntry,
    SpeakerVector,
    TranscriptSegment,
} from './Type';
export {
    EncounterStatus,
    EntityType,
    PipelineStage,
    QueueItemStatus,
} from './Type';
