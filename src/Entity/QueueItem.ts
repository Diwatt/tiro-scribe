/**
 * QueueItem entity: property declarations with visibility; @Column on the property.
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/ForeignKey';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { PipelineStage, QueueItemStatus } from './Type';
import { Encounter } from './Encounter';

dayjs.extend(utc);

const MAX_RETRY_COUNT = 3;

@Entity({ tableName: 'queue_items' })
export class QueueItem extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    private uuid!: string;

    /** References Encounter (UUID). Real column for REFERENCES constraint. */
    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    private encounterId!: string;

    @Column({ default: '', type: 'text' })
    private filePath!: string;

    /** Byte offset into the encrypted file for resumable batch processing. */
    @Column({ default: 0, type: 'integer' })
    private processingOffset!: number;

    @Column({ default: QueueItemStatus.Pending, type: 'varchar', length: 16 })
    private status!: QueueItemStatus;

    @Column({ default: PipelineStage.Waiting, type: 'varchar', length: 16 })
    private pipelineStage!: PipelineStage;

    /** 0–100 whole percent. */
    @Column({ default: 0, type: 'integer' })
    private progressPercent!: number;

    @Column({ default: 0, type: 'integer' })
    private retryCount!: number;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    private createdAt!: Dayjs;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    private updatedAt!: Dayjs;

    public getUuid(): string {
        return this.uuid;
    }

    public getEncounterId(): string {
        return this.encounterId;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public getFilePath(): string {
        return this.filePath;
    }

    public setFilePath(value: string): void {
        this.filePath = value;
    }

    public getProcessingOffset(): number {
        return this.processingOffset;
    }

    public setProcessingOffset(value: number): void {
        this.processingOffset = value;
    }

    public getStatus(): QueueItemStatus {
        return this.status;
    }

    public setStatus(value: QueueItemStatus): void {
        this.status = value;
    }

    public getPipelineStage(): PipelineStage {
        return this.pipelineStage;
    }

    public setPipelineStage(value: PipelineStage): void {
        this.pipelineStage = value;
    }

    public getProgressPercent(): number {
        return this.progressPercent;
    }

    public setProgressPercent(value: number): void {
        this.progressPercent = value;
    }

    public getRetryCount(): number {
        return this.retryCount;
    }

    public setRetryCount(value: number): void {
        this.retryCount = value;
    }

    public getCreatedAt(): Dayjs {
        return this.createdAt;
    }

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public getUpdatedAt(): Dayjs {
        return this.updatedAt;
    }

    public setUpdatedAt(value: Dayjs): void {
        this.updatedAt = value;
    }

    public get isProcessable(): boolean {
        if (this.getStatus() === QueueItemStatus.Pending) {
            return true;
        }
        if (this.getStatus() === QueueItemStatus.Failed && this.getRetryCount() < MAX_RETRY_COUNT) {
            return true;
        }
        return false;
    }
}
