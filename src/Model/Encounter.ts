/**
 * Encounter Model
 * WatermelonDB model for therapy session encounters
 * Links subjects and therapists with session metadata
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, relation} from '@nozbe/watermelondb/decorators';
import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';
import {Subject} from './Subject';
import {Therapist} from './Therapist';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

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
 * Encounter Model Class
 * Defines both schema specification and model fields in one class
 */
export class Encounter extends Model {
    /**
     * Database table name (static property)
     */
    public static readonly tableName = 'encounters';

    /**
     * Schema specification (static property)
     */
    public static readonly schemaSpec: TableSchemaSpec = {
        name: 'encounters',
        columns: [
            {name: 'uuid', type: 'string' as const, isIndexed: true},
            {name: 'subject_id', type: 'string' as const, isIndexed: true},
            {name: 'therapist_id', type: 'string' as const, isIndexed: true},
            {name: 'status', type: 'string' as const, isIndexed: true},
            {name: 'start_date', type: 'number' as const},
            {name: 'end_date', type: 'number' as const, isOptional: true},
            {name: 'created_at', type: 'number' as const},
            {name: 'updated_at', type: 'number' as const},
        ],
    };

    @field('uuid')
    public uuid: string = '';

    @field('subject_id')
    public subjectId: string = '';

    @field('therapist_id')
    public therapistId: string = '';

    @field('status')
    public status: EncounterStatus = EncounterStatus.SCHEDULED;

    @date('start_date')
    public startDate: Date = dayjs.utc().toDate();

    @date('end_date')
    public endDate: Date | null = null;

    @relation('subjects', 'subject_id')
    public subject: Subject | null = null;

    @relation('therapists', 'therapist_id')
    public therapist: Therapist | null = null;

    @date('created_at')
    public createdAt: Date = dayjs.utc().toDate();

    @date('updated_at')
    public updatedAt: Date = dayjs.utc().toDate();
}
