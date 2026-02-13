import type { EntityClass } from '@/Database/Type';
import { Encounter } from './Encounter';
import { ProsodyMetrics } from './ProsodyMetrics';
import { QueueItem } from './QueueItem';
import { Therapist } from './Therapist';
import { Transcription } from './Transcription';

/** All entity classes for schema sync (order: parents before dependents). Add new entities here when you create them. */
export const ENTITY_CLASSES: EntityClass[] = [
    Therapist,
    Encounter,
    QueueItem,
    Transcription,
    ProsodyMetrics,
];

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
