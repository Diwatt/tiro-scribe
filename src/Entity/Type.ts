/**
 * Entity type definitions: enums and shared interfaces for the Scribe data layer.
 */

export enum EncounterStatus {
    RECORDING = 'RECORDING',
    PROCESSING = 'PROCESSING',
    READY = 'READY',
    ARCHIVED = 'ARCHIVED',
}

export enum QueueItemStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export enum PipelineStage {
    UPLOAD = 'UPLOAD',
    TRANSCRIPTION = 'TRANSCRIPTION',
    PROCESSING = 'PROCESSING',
    ANALYSIS = 'ANALYSIS',
}

export enum EntityType {
    PERSON = 'PERSON',
    LOCATION = 'LOCATION',
    FAMILY_RELATION = 'FAMILY_RELATION',
    WORK_RELATION = 'WORK_RELATION',
    DATE = 'DATE',
    TIME = 'TIME',
}

// --- Shared types (Anonymizer, Biocode, AudioProcessing) ---

export interface ProcessingPayload {
    biocode: string;
    cleanTranscript: string;
    confidence: number;
    encounterUuid: string;
    timestamp: number;
}

export interface AudioProcessingResult {
    biocode: string;
    rawTranscript: string;
    cleanTranscript: string;
    confidence: number;
}

export interface AnonymizedEntity {
    original: string;
    replacement: string;
    type: EntityType;
    startIndex: number;
    endIndex: number;
}

export interface AnonymizationResult {
    cleanText: string;
    entities: AnonymizedEntity[];
    confidence: number;
}

export interface SpeakerVector {
    vector: number[];
    confidence: number;
}

export interface BiocodeResult {
    biocode: string;
    confidence: number;
    timestamp: number;
}
