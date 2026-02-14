/**
 * QueueItem entity: property declarations; @Column wires access via _state.
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Encounter } from './Encounter';
import { PipelineStage, QueueItemStatus } from './Type';

dayjs.extend(utc);

const MAX_RETRY_COUNT = 3;

@Entity({ tableName: 'queue_items' })
export class QueueItem extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    @Column({ default: '', type: 'text' })
    public filePath!: string;

    @Column({ default: 0, type: 'integer' })
    public processingOffset!: number;

    @Column({ default: QueueItemStatus.Pending, type: 'varchar', length: 16 })
    public status!: QueueItemStatus;

    @Column({ default: PipelineStage.Waiting, type: 'varchar', length: 16 })
    public pipelineStage!: PipelineStage;

    @Column({ default: 0, type: 'integer' })
    public progressPercent!: number;

    @Column({ default: 0, type: 'integer' })
    public retryCount!: number;

    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    public createdAt!: Dayjs;

    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    public updatedAt!: Dayjs;

    public get isProcessable(): boolean {
        if (this.status === QueueItemStatus.Pending) {
            return true;
        }
        if (this.status === QueueItemStatus.Failed && this.retryCount < MAX_RETRY_COUNT) {
            return true;
        }
        return false;
    }

    public getCreatedAt(): Dayjs {
        return this.createdAt;
    }

    public getEncounterId(): string {
        return this.encounterId;
    }

    public getFilePath(): string {
        return this.filePath;
    }

    public getPipelineStage(): PipelineStage {
        return this.pipelineStage;
    }

    public getProcessingOffset(): number {
        return this.processingOffset;
    }

    public getProgressPercent(): number {
        return this.progressPercent;
    }

    public getRetryCount(): number {
        return this.retryCount;
    }

    public getStatus(): QueueItemStatus {
        return this.status;
    }

    public getUpdatedAt(): Dayjs {
        return this.updatedAt;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public setFilePath(value: string): void {
        this.filePath = value;
    }

    public setPipelineStage(value: PipelineStage): void {
        this.pipelineStage = value;
    }

    public setProcessingOffset(value: number): void {
        this.processingOffset = value;
    }

    public setProgressPercent(value: number): void {
        this.progressPercent = value;
    }

    public setRetryCount(value: number): void {
        this.retryCount = value;
    }

    public setStatus(value: QueueItemStatus): void {
        this.status = value;
    }

    public setUpdatedAt(value: Dayjs): void {
        this.updatedAt = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }
}
