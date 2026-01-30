/**
 * Entity type definitions: enums and shared interfaces for the Scribe data layer.
 */

// --- ENUMS ---

export enum EncounterStatus {
    RECORDING = 'RECORDING',
    WAITING = 'WAITING',           // Waiting for triggers (Wifi/Charger)
    PROCESSING = 'PROCESSING',     // Global status for UI
    READY = 'READY',               // Processing done, ready to view
    ARCHIVED = 'ARCHIVED',
}

export enum QueueItemStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export enum PipelineStage {
    WAITING = 'WAITING',           // Waiting for start conditions
    TRANSCRIBING = 'TRANSCRIBING', // Audio: VAD + Whisper + Speaker ID
    ANONYMIZING = 'ANONYMIZING',   // Text: NER + Anonymization
    TO_SYNC = 'TO_SYNC',           // Ready for server push
}

export enum EntityType {
    PERSON = 'PERSON',
    LOCATION = 'LOCATION',
    FAMILY_RELATION = 'FAMILY_RELATION',
    WORK_RELATION = 'WORK_RELATION',
    DATE = 'DATE',
    TIME = 'TIME',
}

// --- CORE AI INTERFACES (JSON Storage) ---

/**
 * Represents a single transcribed segment.
 * Stored in Encounter.transcript as a JSON array.
 */
export interface TranscriptSegment {
    id: string;             // UUID
    startTime: number;      // Seconds relative to start
    endTime: number;        // Seconds relative to start
    text: string;           // The actual transcribed text

    /**
     * Technical unique label for the session (e.g., "spk_a1b2").
     * Links to a DetectedSpeakerProfile.
     */
    speakerLabel: string;

    confidence: number;     // 0.0 to 1.0
}

/**
 * Represents a speaker profile detected during the session.
 * Stored in Encounter.detectedSpeakers as a JSON array.
 */
export interface DetectedSpeakerProfile {
    label: string;          // Matches TranscriptSegment.speakerLabel (e.g., "spk_a1b2")
    embedding: number[];    // Raw biocode vector (Cam++)

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
