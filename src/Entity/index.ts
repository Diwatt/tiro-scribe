/**
 * Entity Module Exports
 * OOP-style entity classes
 */

// Base Classes and Interfaces
export {AbstractEntity, type IEntity} from './AbstractEntity';

// Entity Classes
export {QueueItem} from './QueueItem';
export {Therapist} from './Therapist';
export {Subject} from './Subject';
export {Encounter, EncounterStatus} from './Encounter';
export {TranscriptionSegment} from './TranscriptionSegment';

// Schema Types
export type {QueueItemSchema, NewQueueItemSchema} from './QueueItem';
export type {TherapistSchema, NewTherapistSchema} from './Therapist';
export type {SubjectSchema, NewSubjectSchema} from './Subject';
export type {EncounterSchema, NewEncounterSchema} from './Encounter';
export type {TranscriptionSegmentSchema, NewTranscriptionSegmentSchema} from './TranscriptionSegment';

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
