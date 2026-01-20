/**
 * Subject Entity
 * Schema and entity class defined in the same file
 * Uses biocode (hashed identity) for privacy-preserving tracking
 */

import {sqliteTable, text, integer, index} from 'drizzle-orm/sqlite-core';
import {therapistsTable} from './Therapist';
import {AbstractEntity} from './AbstractEntity';

/**
 * Subjects Table Schema
 * Subject/patient information (anonymized)
 */
export const subjectsTable = sqliteTable(
    'subjects',
    {
        id: text('id').primaryKey(),
        uuid: text('uuid').notNull().unique(),
        biocode: text('biocode').notNull().unique(),
        therapistId: text('therapist_id')
            .notNull()
            .references(() => therapistsTable.id),
        createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
        updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
    },
    table => ({
        uuidIdx: index('subjects_uuid_idx').on(table.uuid),
        biocodeIdx: index('subjects_biocode_idx').on(table.biocode),
        therapistIdx: index('subjects_therapist_idx').on(table.therapistId),
    })
);

export type SubjectSchema = typeof subjectsTable.$inferSelect;
export type NewSubjectSchema = typeof subjectsTable.$inferInsert;

/**
 * Subject Entity Class
 * Provides business logic and helper methods for subject records
 */
export class Subject extends AbstractEntity<SubjectSchema> {
    public readonly id: string;
    public readonly uuid: string;
    public readonly biocode: string;
    public readonly therapistId: string;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(data: SubjectSchema) {
        super(data);
        this.id = data.id;
        this.uuid = data.uuid;
        this.biocode = data.biocode;
        this.therapistId = data.therapistId;
        this.createdAt = new Date(data.createdAt);
        this.updatedAt = new Date(data.updatedAt);
    }

}
