/**
 * Encounter Entity
 * Schema and entity class defined in the same file
 * Links subjects and therapists with session metadata
 */

import {sqliteTable, text, integer, index} from 'drizzle-orm/sqlite-core';
import {subjectsTable} from './Subject';
import {therapistsTable} from './Therapist';
import {AbstractEntity} from './AbstractEntity';

/**
 * Encounter status enum
 */
export enum EncounterStatus {
    SCHEDULED = 'SCHEDULED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * Encounters Table Schema
 * Therapy session encounters linking subjects and therapists
 */
export const encountersTable = sqliteTable(
    'encounters',
    {
        id: text('id').primaryKey(),
        uuid: text('uuid').notNull().unique(),
        subjectId: text('subject_id')
            .notNull()
            .references(() => subjectsTable.id),
        therapistId: text('therapist_id')
            .notNull()
            .references(() => therapistsTable.id),
        status: text('status').notNull(),
        startDate: integer('start_date', {mode: 'timestamp_ms'}).notNull(),
        endDate: integer('end_date', {mode: 'timestamp_ms'}),
        createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
        updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
    },
    table => ({
        uuidIdx: index('encounters_uuid_idx').on(table.uuid),
        subjectIdx: index('encounters_subject_idx').on(table.subjectId),
        therapistIdx: index('encounters_therapist_idx').on(table.therapistId),
        statusIdx: index('encounters_status_idx').on(table.status),
    })
);

export type EncounterSchema = typeof encountersTable.$inferSelect;
export type NewEncounterSchema = typeof encountersTable.$inferInsert;

/**
 * Encounter Entity Class
 * Provides business logic and helper methods for encounter records
 */
export class Encounter extends AbstractEntity<EncounterSchema> {
    public readonly id: string;
    public readonly uuid: string;
    public readonly subjectId: string;
    public readonly therapistId: string;
    public readonly status: EncounterStatus;
    public readonly startDate: Date;
    public readonly endDate: Date | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(data: EncounterSchema) {
        super(data);
        this.id = data.id;
        this.uuid = data.uuid;
        this.subjectId = data.subjectId;
        this.therapistId = data.therapistId;
        this.status = data.status as EncounterStatus;
        this.startDate = new Date(data.startDate);
        this.endDate = data.endDate ? new Date(data.endDate) : null;
        this.createdAt = new Date(data.createdAt);
        this.updatedAt = new Date(data.updatedAt);
    }

    /**
     * Helper getter to check if encounter is active
     */
    public get isActive(): boolean {
        return this.status === EncounterStatus.IN_PROGRESS;
    }

    /**
     * Helper getter to check if encounter is completed
     */
    public get isCompleted(): boolean {
        return this.status === EncounterStatus.COMPLETED;
    }

    /**
     * Calculate encounter duration in milliseconds
     * Returns null if encounter hasn't ended
     */
    public get duration(): number | null {
        if (!this.endDate) {
            return null;
        }
        return this.endDate.getTime() - this.startDate.getTime();
    }

}
