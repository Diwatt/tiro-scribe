/**
 * Subject Model
 * WatermelonDB model for subject/patient information
 * Uses biocode (hashed identity) for privacy-preserving tracking
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, relation} from '@nozbe/watermelondb/decorators';
import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';
import {Therapist} from './Therapist';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Subject Model Class
 * Defines both schema specification and model fields in one class
 */
export class Subject extends Model {
    /**
     * Database table name (static property)
     */
    public static readonly tableName = 'subjects';

    /**
     * Schema specification (static property)
     */
    public static readonly schemaSpec: TableSchemaSpec = {
        name: 'subjects',
        columns: [
            {name: 'uuid', type: 'string' as const, isIndexed: true},
            {name: 'biocode', type: 'string' as const, isIndexed: true},
            {name: 'therapist_id', type: 'string' as const, isIndexed: true},
            {name: 'created_at', type: 'number' as const},
            {name: 'updated_at', type: 'number' as const},
        ],
    };

    @field('uuid')
    public uuid!: string;

    @field('biocode')
    public biocode!: string;

    @field('therapist_id')
    public therapistId!: string;

    @relation('therapists', 'therapist_id')
    public therapist!: Therapist | null;

    @date('created_at')
    public createdAt!: Date;

    @date('updated_at')
    public updatedAt!: Date;
}
