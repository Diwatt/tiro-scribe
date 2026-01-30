/**
 * QueueItem entity: property declarations with visibility; @Column on the property.
 */

import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { QueueItemStatus, PipelineStage } from './Type';

const MAX_RETRY_COUNT = 3;

@Entity({ table_name: 'queue_items' })
export class QueueItem extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => crypto.randomUUID() })
    private uuid!: string;

    @Column({ default: '' })
    private encounterId!: string;

    @Column({ default: '' })
    private filePath!: string;

    /** Byte offset into the encrypted file for resumable batch processing. */
    @Column({ default: 0 })
    private processingOffset!: number;

    @Column({ default: QueueItemStatus.PENDING })
    private status!: QueueItemStatus;

    @Column({ default: PipelineStage.WAITING })
    private pipelineStage!: PipelineStage;

    @Column({ default: 0 })
    private progressPercent!: number;

    @Column({ default: 0 })
    private retryCount!: number;

    @Column({ default: null })
    private errorLog!: string | null;

    @Column({ default: () => Date.now(), as: 'date' })
    private createdAt!: Date;

    @Column({ default: () => Date.now(), as: 'date' })
    private updatedAt!: Date;

    public getUuid(): string {
        return this.getField<string>('uuid') as string;
    }

    public setUuid(value: string): void {
        this.setField('uuid', value);
    }

    public getEncounterId(): string {
        return this.getField<string>('encounterId') as string;
    }

    public setEncounterId(value: string): void {
        this.setField('encounterId', value);
    }

    public getFilePath(): string {
        return this.getField<string>('filePath') as string;
    }

    public setFilePath(value: string): void {
        this.setField('filePath', value);
    }

    public getProcessingOffset(): number {
        return this.getField<number>('processingOffset') as number;
    }

    public setProcessingOffset(value: number): void {
        this.setField('processingOffset', value);
    }

    public getStatus(): QueueItemStatus {
        return this.getField<QueueItemStatus>('status') as QueueItemStatus;
    }

    public setStatus(value: QueueItemStatus): void {
        this.setField('status', value);
    }

    public getPipelineStage(): PipelineStage {
        return this.getField<PipelineStage>('pipelineStage') as PipelineStage;
    }

    public setPipelineStage(value: PipelineStage): void {
        this.setField('pipelineStage', value);
    }

    public getProgressPercent(): number {
        return this.getField<number>('progressPercent') as number;
    }

    public setProgressPercent(value: number): void {
        this.setField('progressPercent', value);
    }

    public getRetryCount(): number {
        return this.getField<number>('retryCount') as number;
    }

    public setRetryCount(value: number): void {
        this.setField('retryCount', value);
    }

    public getErrorLog(): string | null {
        return this.getField<string | null>('errorLog') as string | null;
    }

    public setErrorLog(value: string | null): void {
        this.setField('errorLog', value);
    }

    public getCreatedAt(): Date {
        return this.getField<Date>('createdAt') as Date;
    }

    public setCreatedAt(value: Date): void {
        this.setField('createdAt', value);
    }

    public getUpdatedAt(): Date {
        return this.getField<Date>('updatedAt') as Date;
    }

    public setUpdatedAt(value: Date): void {
        this.setField('updatedAt', value);
    }

    public get isProcessable(): boolean {
        if (this.status === QueueItemStatus.PENDING) return true;
        if (this.status === QueueItemStatus.FAILED && this.retryCount < MAX_RETRY_COUNT)
            return true;
        return false;
    }

    public get createdAtDate(): Date {
        return this.createdAt;
    }

    public get updatedAtDate(): Date {
        return this.updatedAt;
    }
}
