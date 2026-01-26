/**
 * QueueItem Entity
 * Entity class for queue item records
 */

import {QueueItemStatus, PipelineStage} from './Type';
import {AbstractEntity} from './AbstractEntity';

/**
 * Queue processing constants
 */
const QUEUE = {
    MAX_RETRY_COUNT: 3,
} as const;

/**
 * QueueItem Schema Type
 */
export interface QueueItemSchema {
    id: string;
    encounterUuid: string;
    filePath: string;
    status: string;
    pipelineStage: string;
    progressPercent: number;
    autoProcess: boolean;
    retryCount: number;
    errorLog: string | null;
    createdAt: number;
    updatedAt: number;
}

export type NewQueueItemSchema = Omit<QueueItemSchema, 'id' | 'createdAt' | 'updatedAt'>;

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
