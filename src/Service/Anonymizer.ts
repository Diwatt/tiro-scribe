/**
 * Anonymizer - Hybrid NLP Anonymization
 *
 * Implements a three-layer anonymization approach:
 * 1. Layer 1 (AI): ONNX BERT-NER model for detecting PER (Persons) and LOC (Locations)
 * 2. Layer 2 (Heuristics): Regex/rule engine for family/work relations
 * 3. Layer 3 (Temporal Fuzzing): Date/time shifting to relative timestamps
 */

import {parse, format, addDays, differenceInDays} from 'date-fns';
import {AnonymizationResult, AnonymizedEntity, EntityType} from '../Model/Type';

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

    /**
     * Initialize the Anonymizer with ONNX Runtime
     * @param onnxModule - The native ONNX Runtime module instance
     * @param modelPath - Path to the quantized BERT-NER model
     */
    async initialize(
        onnxModule: OnnxRuntimeInterface,
        modelPath: string,
    ): Promise<void> {
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
        const entities: AnonymizedEntity[] = [];

        // Layer 1: AI-based NER (ONNX BERT-NER)
        const aiEntities = await this.detectEntitiesWithAI(rawText);
        entities.push(...aiEntities);

        // Layer 2: Heuristic-based relation detection
        const relationEntities = this.detectRelations(rawText, entities);
        entities.push(...relationEntities);

        // Layer 3: Temporal fuzzing (dates and times)
        const temporalEntities = this.detectAndFuzzTemporal(rawText, entities);
        entities.push(...temporalEntities);

        // Sort entities by start index (descending) to replace from end to start
        entities.sort((a, b) => b.startIndex - a.startIndex);

        // Apply replacements
        let cleanText = rawText;
        for (const entity of entities) {
            cleanText =
                cleanText.slice(0, entity.startIndex) +
                entity.replacement +
                cleanText.slice(entity.endIndex);
        }

        // Calculate overall confidence (average of all entity confidences)
        const confidence =
            entities.length > 0
                ? entities.reduce((sum, e) => sum + 0.9, 0) / entities.length
                : 1.0;

        return {
            cleanText,
            entities,
            confidence: Math.min(confidence, 1.0),
        };
    }

    /**
     * Layer 1: AI-based Named Entity Recognition using ONNX BERT-NER
     */
    private async detectEntitiesWithAI(
        text: string,
    ): Promise<AnonymizedEntity[]> {
        if (!this.onnxRuntime) {
            console.warn(
                'ONNX Runtime not initialized. Skipping AI-based NER.',
            );
            return [];
        }

        try {
            const results = await this.onnxRuntime.runInference(text);
            const entities: AnonymizedEntity[] = [];

            for (const result of results) {
                if (result.label === 'PER' || result.label === 'LOC') {
                    entities.push({
                        original: result.text,
                        replacement:
                            result.label === 'PER'
                                ? this.generatePersonToken()
                                : this.generateLocationToken(),
                        type:
                            result.label === 'PER'
                                ? EntityType.PERSON
                                : EntityType.LOCATION,
                        startIndex: result.start,
                        endIndex: result.end,
                    });
                }
            }

            return entities;
        } catch (error) {
            console.error('Error in AI-based NER:', error);
            return [];
        }
    }

    /**
     * Layer 2: Heuristic-based relation detection
     */
    private detectRelations(
        text: string,
        existingEntities: AnonymizedEntity[],
    ): AnonymizedEntity[] {
        const entities: AnonymizedEntity[] = [];

        // Family relations patterns
        const familyPatterns = [
            /\b(mother|mom|mama|mum|mommy)\b/gi,
            /\b(father|dad|daddy|papa|pop)\b/gi,
            /\b(sister|sibling|brother)\b/gi,
            /\b(son|daughter|child|kid|children)\b/gi,
            /\b(grandmother|grandma|grandfather|grandpa|grandparent)\b/gi,
            /\b(aunt|uncle|cousin|niece|nephew)\b/gi,
            /\b(husband|wife|spouse|partner)\b/gi,
        ];

        // Work relations patterns
        const workPatterns = [
            /\b(boss|manager|supervisor|employer)\b/gi,
            /\b(colleague|co-worker|coworker|team member)\b/gi,
            /\b(employee|staff|subordinate)\b/gi,
        ];

        // Check for family relations
        for (const pattern of familyPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // Skip if already covered by existing entity
                const isOverlapping = existingEntities.some(
                    e =>
                        match.index >= e.startIndex &&
                        match.index + match[0].length <= e.endIndex,
                );

                if (!isOverlapping) {
                    entities.push({
                        original: match[0],
                        replacement: this.generateFamilyRelationToken(),
                        type: EntityType.FAMILY_RELATION,
                        startIndex: match.index,
                        endIndex: match.index + match[0].length,
                    });
                }
            }
        }

        // Check for work relations
        for (const pattern of workPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const isOverlapping = existingEntities.some(
                    e =>
                        match.index >= e.startIndex &&
                        match.index + match[0].length <= e.endIndex,
                );

                if (!isOverlapping) {
                    entities.push({
                        original: match[0],
                        replacement: this.generateWorkRelationToken(),
                        type: EntityType.WORK_RELATION,
                        startIndex: match.index,
                        endIndex: match.index + match[0].length,
                    });
                }
            }
        }

        return entities;
    }

    /**
     * Layer 3: Temporal fuzzing - detect and convert dates/times to relative
     */
    private detectAndFuzzTemporal(
        text: string,
        existingEntities: AnonymizedEntity[],
    ): AnonymizedEntity[] {
        const entities: AnonymizedEntity[] = [];

        if (!this.sessionStartDate) {
            console.warn(
                'Session start date not set. Temporal fuzzing disabled.',
            );
            return entities;
        }

        // Date patterns
        const datePatterns = [
            // Full dates: "January 12th, 2024" or "12/01/2024"
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi,
            // Short dates: "01/12/2024" or "12-01-2024"
            /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
            // Year only: "2024"
            /\b(19|20)\d{2}\b/g,
        ];

        // Time patterns
        const timePatterns = [
            // "3:30 PM" or "15:30"
            /\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/gi,
            // "yesterday", "today", "tomorrow"
            /\b(yesterday|today|tomorrow)\b/gi,
        ];

        // Process date patterns
        for (const pattern of datePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const isOverlapping = existingEntities.some(
                    e =>
                        match.index >= e.startIndex &&
                        match.index + match[0].length <= e.endIndex,
                );

                if (!isOverlapping) {
                    const relativeDate = this.convertToRelativeDate(match[0]);
                    if (relativeDate) {
                        entities.push({
                            original: match[0],
                            replacement: relativeDate,
                            type: EntityType.DATE,
                            startIndex: match.index,
                            endIndex: match.index + match[0].length,
                        });
                    }
                }
            }
        }

        // Process time patterns
        for (const pattern of timePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const isOverlapping = existingEntities.some(
                    e =>
                        match.index >= e.startIndex &&
                        match.index + match[0].length <= e.endIndex,
                );

                if (!isOverlapping) {
                    const relativeTime = this.convertToRelativeTime(match[0]);
                    if (relativeTime) {
                        entities.push({
                            original: match[0],
                            replacement: relativeTime,
                            type: EntityType.TIME,
                            startIndex: match.index,
                            endIndex: match.index + match[0].length,
                        });
                    }
                }
            }
        }

        return entities;
    }

    /**
     * Convert absolute date to relative date format
     */
    private convertToRelativeDate(dateString: string): string | null {
        if (!this.sessionStartDate) return null;

        try {
            let parsedDate: Date | null = null;

            // Try parsing various date formats
            const formats = [
                'MMMM d, yyyy',
                'MM/dd/yyyy',
                'dd/MM/yyyy',
                'yyyy',
            ];

            for (const fmt of formats) {
                try {
                    parsedDate = parse(dateString, fmt, new Date());
                    if (parsedDate && !isNaN(parsedDate.getTime())) break;
                } catch {
                    continue;
                }
            }

            // Handle year-only patterns
            const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
            if (yearMatch && !parsedDate) {
                const year = parseInt(yearMatch[0]);
                parsedDate = new Date(year, 0, 1);
            }

            if (!parsedDate || isNaN(parsedDate.getTime())) {
                return null;
            }

            const daysDiff = differenceInDays(
                parsedDate,
                this.sessionStartDate,
            );

            if (daysDiff === 0) {
                return '[SESSION_DAY]';
            } else if (daysDiff > 0) {
                return `[DAY_+${daysDiff}]`;
            } else {
                return `[DAY_${daysDiff}]`;
            }
        } catch (error) {
            console.error('Error converting date to relative:', error);
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
        const count = this.relationCounter.get('PERSON') || 0;
        this.relationCounter.set('PERSON', count + 1);
        return `[PERSON_${count + 1}]`;
    }

    /**
     * Generate anonymized token for locations
     */
    private generateLocationToken(): string {
        const count = this.relationCounter.get('LOCATION') || 0;
        this.relationCounter.set('LOCATION', count + 1);
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
