/**
 * QueueItem entity: property declarations with visibility; @Column on the property.
 */

import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Database/Decorators';
import { QueueItemStatus, PipelineStage } from './Type';

const MAX_RETRY_COUNT = 3;

@Entity({ table_name: 'queue_items' })
export class QueueItem extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => crypto.randomUUID() })
    public uuid!: string;

    @Column({ default: '' })
    public encounterId!: string;

    @Column({ default: '' })
    public filePath!: string;

    @Column({ default: QueueItemStatus.PENDING, observable: true })
    public status!: QueueItemStatus;

    @Column({ default: PipelineStage.UPLOAD, observable: true })
    public pipelineStage!: PipelineStage;

    @Column({ default: 0, observable: true })
    public progressPercent!: number;

    @Column({ default: 0 })
    public retryCount!: number;

    @Column({ default: null })
    public errorLog!: string | null;

    @Column({ default: () => Date.now(), as: 'date', observable: true })
    public createdAt!: Date;

    @Column({ default: () => Date.now(), as: 'date', observable: true })
    public updatedAt!: Date;

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
