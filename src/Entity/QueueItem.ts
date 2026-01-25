/**
 * QueueItem Entity
 * Schema and entity class defined in the same file
 */

import {sqliteTable, text, integer, index} from 'drizzle-orm/sqlite-core';
import {QueueItemStatus, PipelineStage} from './Type';
import {AbstractEntity} from './AbstractEntity';

/**
 * Queue processing constants
 */
const QUEUE = {
    MAX_RETRY_COUNT: 3,
} as const;

/**
 * Queue Items Table Schema
 * Processing queue for audio files
 */
export const queueItemsTable = sqliteTable(
    'queue_items',
    {
        id: text('id').primaryKey(),
        encounterUuid: text('encounter_uuid').notNull(),
        filePath: text('file_path').notNull(),
        status: text('status').notNull(),
        pipelineStage: text('pipeline_stage').notNull(),
        progressPercent: integer('progress_percent').notNull().default(0),
        autoProcess: integer('auto_process', {mode: 'boolean'}).notNull().default(true),
        retryCount: integer('retry_count').notNull().default(0),
        errorLog: text('error_log'),
        createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
        updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
    },
    table => ({
        encounterIdx: index('queue_items_encounter_idx').on(table.encounterUuid),
        statusIdx: index('queue_items_status_idx').on(table.status),
        stageIdx: index('queue_items_stage_idx').on(table.pipelineStage),
    })
);

export type QueueItemSchema = typeof queueItemsTable.$inferSelect;
export type NewQueueItemSchema = typeof queueItemsTable.$inferInsert;

/**
 * QueueItem Entity Class
 * Provides business logic and helper methods for queue item records
 */
export class QueueItem extends AbstractEntity<QueueItemSchema> {
    public readonly id: string;
    public readonly encounterUuid: string;
    public readonly filePath: string;
    public readonly status: QueueItemStatus;
    public readonly pipelineStage: PipelineStage;
    public readonly progressPercent: number;
    public readonly autoProcess: boolean;
    public readonly retryCount: number;
    public readonly errorLog: string | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(data: QueueItemSchema) {
        super(data);
        this.id = data.id;
        this.encounterUuid = data.encounterUuid;
        this.filePath = data.filePath;
        this.status = data.status as QueueItemStatus;
        this.pipelineStage = data.pipelineStage as PipelineStage;
        this.progressPercent = data.progressPercent;
        this.autoProcess = data.autoProcess;
        this.retryCount = data.retryCount;
        this.errorLog = data.errorLog;
        this.createdAt = new Date(data.createdAt);
        this.updatedAt = new Date(data.updatedAt);
    }

    /**
     * Helper getter to check if item is processable
     * Returns true if status is PENDING or FAILED with retry_count < 3
     */
    public get isProcessable(): boolean {
        if (this.status === QueueItemStatus.PENDING) {
            return true;
        }
        if (this.status === QueueItemStatus.FAILED && this.retryCount < QUEUE.MAX_RETRY_COUNT) {
            return true;
        }
        return false;
    }

}
