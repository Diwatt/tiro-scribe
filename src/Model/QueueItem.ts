/**
 * QueueItem Model
 * WatermelonDB model for processing queue items
 * Schema and model properties defined together in one class
 */

import {Model} from '@nozbe/watermelondb';
import {field, date} from '@nozbe/watermelondb/decorators';
import type {TableSchemaSpec} from '@nozbe/watermelondb/Schema';
import {QueueItemStatus, PipelineStage} from './Type';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * QueueItem Model Class
 * Defines both schema specification and model fields in one class
 */
export class QueueItem extends Model {
    /**
     * Database table name (static property)
     */
    public static readonly tableName = 'queue_items';

    /**
     * Schema specification (static property)
     */
    public static readonly schemaSpec: TableSchemaSpec = {
        name: 'queue_items',
        columns: [
            {name: 'encounter_uuid', type: 'string' as const, isIndexed: true},
            {name: 'file_path', type: 'string' as const},
            {name: 'status', type: 'string' as const, isIndexed: true},
            {name: 'pipeline_stage', type: 'string' as const, isIndexed: true},
            {name: 'progress_percent', type: 'number' as const},
            {name: 'auto_process', type: 'boolean' as const},
            {name: 'retry_count', type: 'number' as const},
            {name: 'error_log', type: 'string' as const, isOptional: true},
            {name: 'created_at', type: 'number' as const},
            {name: 'updated_at', type: 'number' as const},
        ],
    };

    @field('encounter_uuid')
    public encounterUuid!: string;

    @field('file_path')
    public filePath!: string;

    @field('status')
    public status!: QueueItemStatus;

    @field('pipeline_stage')
    public pipelineStage!: PipelineStage;

    @field('progress_percent')
    public progressPercent!: number;

    @field('auto_process')
    public autoProcess!: boolean;

    @field('retry_count')
    public retryCount!: number;

    @field('error_log')
    public errorLog!: string | null;

    @date('created_at')
    public createdAt!: Date;

    @date('updated_at')
    public updatedAt!: Date;

    /**
     * Helper getter to check if item is processable
     * Returns true if status is PENDING or FAILED with retry_count < 3
     */
    public get isProcessable(): boolean {
        if (this.status === QueueItemStatus.PENDING) {
            return true;
        }
        if (this.status === QueueItemStatus.FAILED && this.retryCount < 3) {
            return true;
        }
        return false;
    }
}
