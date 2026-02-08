/**
 * Entity type definitions: enums and shared interfaces for the Scribe data layer.
 */

// --- ENUMS ---

export enum EncounterStatus {
    Recording = 'recording',
    Waiting = 'waiting', // Waiting for triggers (Wifi/Charger)
    Processing = 'processing', // Global status for UI
    Ready = 'ready', // Processing done, ready to view
    Archived = 'archived',
}

export enum QueueItemStatus {
    Pending = 'pending',
    Running = 'running',
    Paused = 'paused',
    Completed = 'completed',
    Failed = 'failed',
}

export enum PipelineStage {
    Waiting = 'waiting', // Waiting for start conditions
    Transcribing = 'transcribing', // Audio: VAD + Whisper + Speaker ID
    Anonymizing = 'anonymizing', // Text: NER + Anonymization
    ToSync = 'to_sync', // Ready for server push
}

/**
 * Single processing error (last error on QueueItem; not stored as array in DB).
 * For processing/support only: must contain only technical data (stage, error message).
 * No PHI, no file paths that reveal user content, no transcript snippets.
 * Safe for the user to send to support.
 */
export interface QueueItemErrorEntry {
    timestamp: string; // ISO UTC
    stage: PipelineStage;
    message: string; // Technical error only; no private data
}

export enum EntityType {
    Person = 'person',
    Location = 'location',
    FamilyRelation = 'family_relation',
    WorkRelation = 'work_relation',
    Date = 'date',
    Time = 'time',
}

// --- CORE AI INTERFACES (JSON Storage) ---

/**
 * Represents a single transcribed segment.
 * Stored in Encounter.transcript as a JSON array.
 */
export interface TranscriptSegment {
    id: string; // UUID
    startTime: number; // Seconds relative to start
    endTime: number; // Seconds relative to start
    text: string; // The actual transcribed text

    /**
     * Technical unique label for the session (e.g., "spk_a1b2").
     * Links to a DetectedSpeakerProfile.
     */
    speakerLabel: string;

    confidence: number; // 0.0 to 1.0
}

/**
 * Represents a speaker profile detected during the session.
 * Stored in Encounter.detectedSpeakers as a JSON array.
 */
export interface DetectedSpeakerProfile {
    label: string; // Matches TranscriptSegment.speakerLabel (e.g., "spk_a1b2")
    embedding: number[]; // Raw biocode vector (Cam++)

    /**
     * The resolved Participant UUID (Therapist or Patient).
     * Null if unknown/unidentified.
     */
    identifiedParticipantUuid: string | null;

    displayName: string | null; // UI friendly name (e.g. "Therapist", "Patient")
}

// --- ANONYMIZATION & AUDIO PROCESSING ---

/** Single anonymized span (original text + replacement + type). */
export interface AnonymizedEntity {
    original: string;
    replacement: string;
    type: EntityType;
    startIndex: number;
    endIndex: number;
}

/** Result of anonymize(): clean text, entities, confidence. */
export interface AnonymizationResult {
    cleanText: string;
    entities: AnonymizedEntity[];
    confidence: number;
}

/** Payload passed through the audio pipeline (transcription → anonymization → biocode). */
export interface ProcessingPayload {
    biocode: string;
    cleanTranscript: string;
    confidence: number;
    encounterUuid: string;
    timestamp: number;
}

/** Detailed result from audio processing (raw + anonymized + biocode). */
export interface AudioProcessingResult {
    rawText: string;
    anonymizedText: string;
    biocode: string;
    confidence: number;
}

/** Extracted speaker vector from audio (e.g. Sherpa-ONNX). */
export interface SpeakerVector {
    vector: number[];
    confidence: number;
}

/** Result of Biocode.generateBiocode / processAudio. */
export interface BiocodeResult {
    biocode: string;
    confidence: number;
    timestamp: number;
}
