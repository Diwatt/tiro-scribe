/**
 * TranscriptionSegment Model
 * WatermelonDB model for transcription segments from Whisper
 * Stores individual segments with timing and confidence data
 */

import {Model} from '@nozbe/watermelondb';
import {field, date, relation} from '@nozbe/watermelondb/decorators';
import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';
import {Encounter} from './Encounter';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * TranscriptionSegment Model Class
 * Defines both schema specification and model fields in one class
 */
export class TranscriptionSegment extends Model {
    /**
     * Database table name (static property)
     */
    public static readonly tableName = 'transcription_segments';

    /**
     * Schema specification (static property)
     */
    public static readonly schemaSpec: TableSchemaSpec = {
        name: 'transcription_segments',
        columns: [
            {name: 'uuid', type: 'string' as const, isIndexed: true},
            {name: 'encounter_id', type: 'string' as const, isIndexed: true},
            {name: 'text', type: 'string' as const},
            {name: 'start_time', type: 'number' as const},
            {name: 'end_time', type: 'number' as const},
            {name: 'confidence', type: 'number' as const, isOptional: true},
            {name: 'created_at', type: 'number' as const},
            {name: 'updated_at', type: 'number' as const},
        ],
    };

    @field('uuid')
    public uuid!: string;

    @field('encounter_id')
    public encounterId!: string;

    @field('text')
    public text!: string;

    @field('start_time')
    public startTime!: number;

    @field('end_time')
    public endTime!: number;

    @field('confidence')
    public confidence!: number | null;

    @relation('encounters', 'encounter_id')
    public encounter!: Encounter | null;

    @date('created_at')
    public createdAt!: Date;

    @date('updated_at')
    public updatedAt!: Date;
}
