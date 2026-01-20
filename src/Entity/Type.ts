/**
 * Entity Type Enums and Interfaces
 * Shared type definitions for entity status, stages, and processing payloads
 */

/**
 * Queue Item Status
 */
export enum QueueItemStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

/**
 * Pipeline Stage
 */
export enum PipelineStage {
    RECORDING = 'RECORDING',
    RECOGNITION = 'RECOGNITION',
    FORMATTING = 'FORMATTING',
    ANONYMIZING = 'ANONYMIZING',
    SECURING = 'SECURING',
    TRANSCRIPTION = 'TRANSCRIPTION',
    ANONYMIZATION = 'ANONYMIZATION',
    ANALYSIS = 'ANALYSIS',
}

/**
 * Processing Payload
 * Result of audio processing pipeline
 */
export interface ProcessingPayload {
    biocode: string;
    cleanTranscript: string;
    confidence: number;
    encounterUuid: string;
    timestamp: number;
}

/**
 * Audio Processing Result
 * Internal result structure from audio processing
 */
export interface AudioProcessingResult {
    biocode: string;
    rawTranscript: string;
    cleanTranscript: string;
    confidence: number;
}

/**
 * Entity Type
 * Types of entities that can be detected and anonymized
 */
export enum EntityType {
    PERSON = 'PERSON',
    LOCATION = 'LOCATION',
    FAMILY_RELATION = 'FAMILY_RELATION',
    WORK_RELATION = 'WORK_RELATION',
    DATE = 'DATE',
    TIME = 'TIME',
}

/**
 * Anonymized Entity
 * Represents a detected entity that has been anonymized
 */
export interface AnonymizedEntity {
    original: string;
    replacement: string;
    type: EntityType;
    startIndex: number;
    endIndex: number;
}

/**
 * Anonymization Result
 * Result of the anonymization process
 */
export interface AnonymizationResult {
    cleanText: string;
    entities: AnonymizedEntity[];
    confidence: number;
}

/**
 * Speaker Vector
 * Extracted speaker embedding vector from audio
 */
export interface SpeakerVector {
    vector: number[];
    confidence: number;
}

/**
 * Biocode Result
 * Result of biocode generation from speaker vector
 */
export interface BiocodeResult {
    biocode: string;
    confidence: number;
    timestamp: number;
}
