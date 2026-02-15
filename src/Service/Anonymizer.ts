/**
 * Anonymizer - Hybrid NLP Anonymization
 *
 * Implements a three-layer anonymization approach:
 * 1. Layer 1 (AI): ONNX BERT-NER model for detecting PER (Persons) and LOC (Locations)
 * 2. Layer 2 (Heuristics): Regex/rule engine for family/work relations
 * 3. Layer 3 (Temporal Fuzzing): Date/time shifting to relative timestamps
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { EntityType } from '@/Entity';
import { AppLogger, type LoggerInterface } from './Logger';

dayjs.extend(customParseFormat);

/** Represents a redacted span. */
export class Redaction {
    constructor(
        public original: string,
        public replacement: string,
        public type: EntityType,
        public index: number,
    ) {}
}

/** Result of anonymize(): clean text, redactions, confidence. */
export class AnonymizationResult {
    constructor(
        public cleanText: string,
        public entities: Redaction[],
        public confidence: number,
    ) {}
}

/**
 * Entity replacement tokens for anonymization
 */
export const ENTITY_TOKENS = {
    PERSON: '[PERSON]',
    LOCATION: '[LOCATION]',
    FAMILY_RELATION: '[RELATION_FAMILY]',
    WORK_RELATION: '[RELATION_WORK]',
    DATE: '[DATE_FUZZED]',
    TIME: '[TIME_FUZZED]',
} as const;

// Type definitions for ONNX Runtime (to be implemented with native module)
interface OnnxRuntimeInterface {
    loadModel(modelPath: string): Promise<void>;
    runInference(text: string): Promise<ONNXNERResult[]>;
}

interface ONNXNERResult {
    text: string;
    label: 'PER' | 'LOC' | 'ORG' | 'MISC';
    start: number;
    end: number;
    confidence: number;
}

export class Anonymizer {
    private onnxRuntime: OnnxRuntimeInterface | null = null;
    private sessionStartDate: Date | null = null;
    private relationCounter: Map<string, number> = new Map();
    private loggerInstance: LoggerInterface;

    constructor(logger: LoggerInterface = AppLogger.getInstance()) {
        this.loggerInstance = logger;
    }

    /**
     * Initialize the Anonymizer with ONNX Runtime
     * @param onnxModule - The native ONNX Runtime module instance
     * @param modelPath - Path to the quantized BERT-NER model
     */
    async initialize(onnxModule: OnnxRuntimeInterface, modelPath: string): Promise<void> {
        this.onnxRuntime = onnxModule;
        await this.onnxRuntime.loadModel(modelPath);
    }

    /**
     * Set the session start date for temporal fuzzing
     * @param startDate - The start date/time of the session
     */
    setSessionStartDate(startDate: Date): void {
        this.sessionStartDate = startDate;
    }

    /**
     * Main anonymization method
     * @param rawText - The raw transcribed text
     * @returns Anonymized text with entity metadata
     */
    async anonymize(rawText: string): Promise<AnonymizationResult> {
        const entities: Redaction[] = [];

        // Layer 1: AI-based NER (ONNX BERT-NER)
        const aiEntities = await this.detectEntitiesWithAI(rawText);
        entities.push(...aiEntities);

        // Layer 2: Heuristic-based relation detection
        const relationEntities = this.detectRelations(rawText, entities);
        entities.push(...relationEntities);

        // Layer 3: Temporal fuzzing (dates and times)
        const temporalEntities = this.detectAndFuzzTemporal(rawText, entities);
        entities.push(...temporalEntities);

        // Sort by start index (descending) to replace from end to start
        entities.sort((a, b) => b.index - a.index);

        // Apply replacements (end = index + original.length)
        let cleanText = rawText;
        for (const entity of entities) {
            const end = entity.index + entity.original.length;
            cleanText = cleanText.slice(0, entity.index) + entity.replacement + cleanText.slice(end);
        }

        const confidence = entities.length > 0 ? entities.reduce((sum, _e) => sum + 0.9, 0) / entities.length : 1.0;
        return new AnonymizationResult(cleanText, entities, Math.min(confidence, 1.0));
    }

    /**
     * Layer 1: AI-based Named Entity Recognition using ONNX BERT-NER
     */
    private async detectEntitiesWithAI(text: string): Promise<Redaction[]> {
        if (!this.onnxRuntime) {
            this.loggerInstance.warn('ONNX Runtime not initialized. Skipping AI-based NER.');
            return [];
        }

        try {
            const results = await this.onnxRuntime.runInference(text);
            const entities: Redaction[] = [];

            for (const result of results) {
                if (result.label === 'PER' || result.label === 'LOC') {
                    entities.push(
                        new Redaction(
                            result.text,
                            result.label === 'PER' ? this.generatePersonToken() : this.generateLocationToken(),
                            result.label === 'PER' ? EntityType.Person : EntityType.Location,
                            result.start,
                        ),
                    );
                }
            }
            return entities;
        } catch (error) {
            this.loggerInstance.error('Error in AI-based NER:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }

    /**
     * Layer 2: Heuristic-based relation detection
     */
    private detectRelations(text: string, existingEntities: Redaction[]): Redaction[] {
        const entities: Redaction[] = [];

        const familyPatterns = [
            /\b(mother|mom|mama|mum|mommy)\b/gi,
            /\b(father|dad|daddy|papa|pop)\b/gi,
            /\b(sister|sibling|brother)\b/gi,
            /\b(son|daughter|child|kid|children)\b/gi,
            /\b(grandmother|grandma|grandfather|grandpa|grandparent)\b/gi,
            /\b(aunt|uncle|cousin|niece|nephew)\b/gi,
            /\b(husband|wife|spouse|partner)\b/gi,
        ];

        const workPatterns = [
            /\b(boss|manager|supervisor|employer)\b/gi,
            /\b(colleague|co-worker|coworker|team member)\b/gi,
            /\b(employee|staff|subordinate)\b/gi,
        ];

        for (const pattern of familyPatterns) {
            let match: RegExpExecArray | null = pattern.exec(text);
            while (match !== null) {
                const m = match;
                const isOverlapping = existingEntities.some((e) => m.index >= e.index && m.index + m[0].length <= e.index + e.original.length);

                if (!isOverlapping) {
                    entities.push(new Redaction(m[0], this.generateFamilyRelationToken(), EntityType.FamilyRelation, m.index));
                }
                match = pattern.exec(text);
            }
        }

        for (const pattern of workPatterns) {
            let match: RegExpExecArray | null = pattern.exec(text);
            while (match !== null) {
                const m = match;
                const isOverlapping = existingEntities.some((e) => m.index >= e.index && m.index + m[0].length <= e.index + e.original.length);

                if (!isOverlapping) {
                    entities.push(new Redaction(m[0], this.generateWorkRelationToken(), EntityType.WorkRelation, m.index));
                }
                match = pattern.exec(text);
            }
        }
        return entities;
    }

    /**
     * Layer 3: Temporal fuzzing - detect and convert dates/times to relative
     */
    private detectAndFuzzTemporal(text: string, existingEntities: Redaction[]): Redaction[] {
        const entities: Redaction[] = [];

        if (!this.sessionStartDate) {
            this.loggerInstance.warn('Session start date not set. Temporal fuzzing disabled.');
            return entities;
        }

        const datePatterns = [
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi,
            /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g,
            /\b(19|20)\d{2}\b/g,
        ];

        const timePatterns = [
            /\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/gi,
            /\b(yesterday|today|tomorrow)\b/gi,
        ];

        for (const pattern of datePatterns) {
            let match: RegExpExecArray | null = pattern.exec(text);
            while (match !== null) {
                const m = match;
                const isOverlapping = existingEntities.some((e) => m.index >= e.index && m.index + m[0].length <= e.index + e.original.length);

                if (!isOverlapping) {
                    const relativeDate = this.convertToRelativeDate(m[0]);
                    if (relativeDate) {
                        entities.push(new Redaction(m[0], relativeDate, EntityType.Date, m.index));
                    }
                }
                match = pattern.exec(text);
            }
        }

        for (const pattern of timePatterns) {
            let match: RegExpExecArray | null = pattern.exec(text);
            while (match !== null) {
                const m = match;
                const isOverlapping = existingEntities.some((e) => m.index >= e.index && m.index + m[0].length <= e.index + e.original.length);

                if (!isOverlapping) {
                    const relativeTime = this.convertToRelativeTime(m[0]);
                    if (relativeTime) {
                        entities.push(new Redaction(m[0], relativeTime, EntityType.Time, m.index));
                    }
                }
                match = pattern.exec(text);
            }
        }
        return entities;
    }

    /**
     * Convert absolute date to relative date format
     */
    private convertToRelativeDate(dateString: string): string | null {
        if (!this.sessionStartDate) {
            return null;
        }

        try {
            let parsedDate: Date | null = null;

            // Try parsing various date formats (dayjs format syntax)
            const formats = [
                'MMMM D, YYYY', // "January 12, 2024"
                'MM/DD/YYYY', // "01/12/2024"
                'DD/MM/YYYY', // "12/01/2024"
                'YYYY', // "2024"
            ];

            for (const fmt of formats) {
                try {
                    const parsed = dayjs(dateString, fmt, true);
                    if (parsed.isValid()) {
                        parsedDate = parsed.toDate();
                        break;
                    }
                } catch {}
            }

            // Handle year-only patterns
            const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
            if (yearMatch && !parsedDate) {
                const year = parseInt(yearMatch[0], 10);
                parsedDate = new Date(year, 0, 1);
            }

            if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
                return null;
            }

            const daysDiff = dayjs(parsedDate).diff(dayjs(this.sessionStartDate), 'day');

            if (daysDiff === 0) {
                return '[SESSION_DAY]';
            } else if (daysDiff > 0) {
                return `[DAY_+${daysDiff}]`;
            } else {
                return `[DAY_${daysDiff}]`;
            }
        } catch (error) {
            this.loggerInstance.error('Error converting date to relative:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
            });
            return '[DATE_FUZZED]';
        }
    }

    /**
     * Convert absolute time to relative time format
     */
    private convertToRelativeTime(timeString: string): string | null {
        // For times, we preserve the time but remove specific context
        // "3:30 PM" -> "[TIME_AFTERNOON]" or keep as "[TIME_FUZZED]"
        const lowerTime = timeString.toLowerCase();

        if (lowerTime.includes('yesterday')) {
            return '[DAY_-1]';
        } else if (lowerTime.includes('today')) {
            return '[SESSION_DAY]';
        } else if (lowerTime.includes('tomorrow')) {
            return '[DAY_+1]';
        } else {
            // For specific times, just fuzz them
            return '[TIME_FUZZED]';
        }
    }

    /**
     * Generate anonymized token for persons
     */
    private generatePersonToken(): string {
        const count = this.relationCounter.get(EntityType.Person) || 0;
        this.relationCounter.set(EntityType.Person, count + 1);
        return `[PERSON_${count + 1}]`;
    }

    /**
     * Generate anonymized token for locations
     */
    private generateLocationToken(): string {
        const count = this.relationCounter.get(EntityType.Location) || 0;
        this.relationCounter.set(EntityType.Location, count + 1);
        return `[LOCATION_${count + 1}]`;
    }

    /**
     * Generate anonymized token for family relations
     */
    private generateFamilyRelationToken(): string {
        const count = this.relationCounter.get('FAMILY') || 0;
        this.relationCounter.set('FAMILY', count + 1);
        return `[RELATION_FAMILY_${count + 1}]`;
    }

    /**
     * Generate anonymized token for work relations
     */
    private generateWorkRelationToken(): string {
        const count = this.relationCounter.get('WORK') || 0;
        this.relationCounter.set('WORK', count + 1);
        return `[RELATION_WORK_${count + 1}]`;
    }

    /**
     * Reset the relation counter (call at the start of each session)
     */
    reset(): void {
        this.relationCounter.clear();
        this.sessionStartDate = null;
    }
}
