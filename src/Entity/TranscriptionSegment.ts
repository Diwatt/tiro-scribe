/**
 * TranscriptionSegment Entity
 * Schema and entity class defined in the same file
 * Stores individual segments with timing and confidence data
 */

import {sqliteTable, text, integer, index} from 'drizzle-orm/sqlite-core';
import {encountersTable} from './Encounter';
import {AbstractEntity} from './AbstractEntity';

/**
 * Transcription Segments Table Schema
 * Individual transcription segments from Whisper
 */
export const transcriptionSegmentsTable = sqliteTable(
    'transcription_segments',
    {
        id: text('id').primaryKey(),
        uuid: text('uuid').notNull().unique(),
        encounterId: text('encounter_id')
            .notNull()
            .references(() => encountersTable.id),
        text: text('text').notNull(),
        startTime: integer('start_time').notNull(),
        endTime: integer('end_time').notNull(),
        confidence: integer('confidence'),
        createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
        updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
    },
    table => ({
        uuidIdx: index('transcription_segments_uuid_idx').on(table.uuid),
        encounterIdx: index('transcription_segments_encounter_idx').on(table.encounterId),
    })
);

export type TranscriptionSegmentSchema = typeof transcriptionSegmentsTable.$inferSelect;
export type NewTranscriptionSegmentSchema = typeof transcriptionSegmentsTable.$inferInsert;

/**
 * TranscriptionSegment Entity Class
 * Provides business logic and helper methods for transcription segment records
 */
export class TranscriptionSegment extends AbstractEntity<TranscriptionSegmentSchema> {
    public readonly id: string;
    public readonly uuid: string;
    public readonly encounterId: string;
    public readonly text: string;
    public readonly startTime: number;
    public readonly endTime: number;
    public readonly confidence: number | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(data: TranscriptionSegmentSchema) {
        super(data);
        this.id = data.id;
        this.uuid = data.uuid;
        this.encounterId = data.encounterId;
        this.text = data.text;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.confidence = data.confidence;
        this.createdAt = new Date(data.createdAt);
        this.updatedAt = new Date(data.updatedAt);
    }

    /**
     * Get segment duration in milliseconds
     */
    public get duration(): number {
        return this.endTime - this.startTime;
    }

    /**
     * Check if segment has high confidence (>= 80%)
     */
    public get hasHighConfidence(): boolean {
        return this.confidence !== null && this.confidence >= 80;
    }

    /**
     * Format start/end time as HH:MM:SS
     */
    public formatTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return [hours, minutes, seconds]
            .map(val => String(val).padStart(2, '0'))
            .join(':');
    }

    /**
     * Get formatted start time
     */
    public get formattedStartTime(): string {
        return this.formatTime(this.startTime);
    }

    /**
     * Get formatted end time
     */
    public get formattedEndTime(): string {
        return this.formatTime(this.endTime);
    }

}
