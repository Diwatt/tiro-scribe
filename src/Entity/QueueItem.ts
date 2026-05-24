/**
 * QueueItem entity: a processing job for an Encounter.
 * Tracks the pipeline stage (transcribe → anonymize → sync) and execution state.
 * Created when an Encounter is marked ToProcess; removed when processing completes.
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
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    public createdAt!: Dayjs;

    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    @Column({ default: '', type: 'text' })
    public errorMessage!: string;

    @Column({ default: '', type: 'text' })
    public encryptedAudioPath!: string;

    @Column({ default: 3, type: 'integer' })
    public maxRetries!: number;

    @Column({ default: '{}', type: 'text', as: 'json' })
    public metadata!: Record<string, unknown>;

    @Column({ default: PipelineStage.Waiting, type: 'varchar', length: 16 })
    public pipelineStage!: PipelineStage;

    @Column({ default: 1, type: 'integer' })
    public priority!: number;

    @Column({ default: 0, type: 'integer' })
    public processingOffset!: number;

    @Column({ default: 0, type: 'integer' })
    public progressPercent!: number;

    @Column({ default: 0, type: 'integer' })
    public retryCount!: number;

    @Column({ default: QueueItemStatus.Pending, type: 'varchar', length: 16 })
    public status!: QueueItemStatus;

    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    public updatedAt!: Dayjs;

    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

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

    public getEncryptedAudioPath(): string {
        return this.encryptedAudioPath;
    }

    public getErrorMessage(): string {
        return this.errorMessage;
    }

    public getMaxRetries(): number {
        return this.maxRetries;
    }

    public getMetadata(): Record<string, unknown> {
        return this.metadata;
    }

    public getPipelineStage(): PipelineStage {
        return this.pipelineStage;
    }

    public getPriority(): number {
        return this.priority;
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

    public setEncryptedAudioPath(value: string): void {
        this.encryptedAudioPath = value;
    }

    public setErrorMessage(value: string): void {
        this.errorMessage = value;
    }

    public setMaxRetries(value: number): void {
        this.maxRetries = value;
    }

    public setMetadata(value: Record<string, unknown>): void {
        this.metadata = value;
    }

    public setPipelineStage(value: PipelineStage): void {
        this.pipelineStage = value;
    }

    public setPriority(value: number): void {
        this.priority = value;
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

    public static createForEncounter(
        encounterId: string,
        encryptedAudioPath: string,
    ): QueueItem {
        const item = new QueueItem();

        item.encounterId = encounterId;
        item.encryptedAudioPath = encryptedAudioPath;

        return item;
    }
}
