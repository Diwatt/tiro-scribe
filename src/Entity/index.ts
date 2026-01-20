/**
 * Entity Module Exports
 * OOP-style entities wrapping Drizzle database records
 */

// Base Classes and Interfaces
export {AbstractEntity, type IEntity} from './AbstractEntity';

// Entity Classes
export {QueueItem} from './QueueItem';
export {Therapist} from './Therapist';
export {Subject} from './Subject';
export {Encounter, EncounterStatus} from './Encounter';
export {TranscriptionSegment} from './TranscriptionSegment';

// Table Schemas
export {queueItemsTable} from './QueueItem';
export {therapistsTable} from './Therapist';
export {subjectsTable} from './Subject';
export {encountersTable} from './Encounter';
export {transcriptionSegmentsTable} from './TranscriptionSegment';

// Enums & Types
export {QueueItemStatus, PipelineStage, EntityType} from './Type';
export type {
    ProcessingPayload,
    AudioProcessingResult,
    AnonymizationResult,
    AnonymizedEntity,
    SpeakerVector,
    BiocodeResult,
} from './Type';
