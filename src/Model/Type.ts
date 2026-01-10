/**
 * Core type definitions for the Open Luborsky Mobile application
 */

export interface SpeakerVector {
  vector: number[];
  confidence: number;
}

export interface BiocodeResult {
  biocode: string;
  confidence: number;
  timestamp: number;
}

export interface AnonymizedEntity {
  original: string;
  replacement: string;
  type: EntityType;
  startIndex: number;
  endIndex: number;
}

export enum EntityType {
  PERSON = 'PERSON',
  LOCATION = 'LOCATION',
  FAMILY_RELATION = 'FAMILY_RELATION',
  WORK_RELATION = 'WORK_RELATION',
  DATE = 'DATE',
  TIME = 'TIME',
}

export interface AnonymizationResult {
  cleanText: string;
  entities: AnonymizedEntity[];
  confidence: number;
}

export interface ProcessingPayload {
  biocode: string;
  cleanTranscript: string;
  confidence: number;
  sessionId: string;
  timestamp: number;
}

export interface AudioProcessingResult {
  rawText: string;
  anonymizedText: string;
  biocode: string;
  confidence: number;
}

export interface TherapistSalt {
  therapistId: string;
  salt: string;
}
