/**
 * DownloadQueue entity: dedicated table for inference model download tasks.
 * No polymorphic fields; only download‑specific properties.
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import type { DownloadTask } from '../Service/InferenceModelDownload/Type';
import { DownloadQueueStatus } from './Type';

dayjs.extend(utc);

const MAX_RETRY_COUNT = 3;

@Entity({ tableName: 'download_queue' })
export class DownloadQueue extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    @Column({ default: '', type: 'varchar', length: 64, index: true })
    public capability!: string;

    @Column({ default: '', type: 'varchar', length: 8, index: true })
    public language!: string;

    @Column({ default: DownloadQueueStatus.Pending, type: 'varchar', length: 16, index: true })
    public status!: DownloadQueueStatus;

    @Column({ default: 0, type: 'integer' })
    public progressPercent!: number;

    @Column({ default: 0, type: 'integer' })
    public nbRetries!: number;

    @Column({ default: 3, type: 'integer' })
    public maxRetries!: number;

    @Column({ default: '', type: 'text' })
    public errorMessage!: string;

    @Column({ default: '{}', type: 'text', as: 'json' })
    public metadata!: Record<string, unknown>;

    @Column({ default: '', type: 'text' })
    public filePath!: string;

    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date', index: true })
    public createdAt!: Dayjs;

    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    public updatedAt!: Dayjs;

    // --- Getters ---

    public getUuid(): string {
        return this.uuid;
    }

    public getCapability(): string {
        return this.capability;
    }

    public getLanguage(): string {
        return this.language;
    }

    public getStatus(): DownloadQueueStatus {
        return this.status;
    }

    public getProgressPercent(): number {
        return this.progressPercent;
    }

    public getNbRetries(): number {
        return this.nbRetries;
    }

    public getMaxRetries(): number {
        return this.maxRetries;
    }

    public getErrorMessage(): string {
        return this.errorMessage;
    }

    public getMetadata(): Record<string, unknown> {
        return this.metadata;
    }

    public getFilePath(): string {
        return this.filePath;
    }

    public getCreatedAt(): Dayjs {
        return this.createdAt;
    }

    public getUpdatedAt(): Dayjs {
        return this.updatedAt;
    }

    // --- Setters ---

    public setUuid(value: string): void {
        this.uuid = value;
    }

    public setCapability(value: string): void {
        this.capability = value;
    }

    public setLanguage(value: string): void {
        this.language = value;
    }

    public setStatus(value: DownloadQueueStatus): void {
        this.status = value;
    }

    public setProgressPercent(value: number): void {
        this.progressPercent = value;
    }

    public setNbRetries(value: number): void {
        this.nbRetries = value;
    }

    public setMaxRetries(value: number): void {
        this.maxRetries = value;
    }

    public setErrorMessage(value: string): void {
        this.errorMessage = value;
    }

    public setMetadata(value: Record<string, unknown>): void {
        this.metadata = value;
    }

    public setFilePath(value: string): void {
        this.filePath = value;
    }

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public setUpdatedAt(value: Dayjs): void {
        this.updatedAt = value;
    }

    // --- Business logic ---

    public get isProcessable(): boolean {
        if (this.status === DownloadQueueStatus.Pending) {
            return true;
        }
        if (this.status === DownloadQueueStatus.Failed && this.nbRetries < MAX_RETRY_COUNT) {
            return true;
        }
        return false;
    }

    // --- Static conversion methods ---

    /**
     * Create a DownloadQueue entity from a DownloadTask DataObject.
     */
    public static fromTask(task: DownloadTask): DownloadQueue {
        const entity = new DownloadQueue();

        entity.uuid = task.id;
        entity.capability = task.capability;
        entity.language = task.language || '';
        entity.nbRetries = task.nbRetries;
        entity.maxRetries = task.maxRetries;
        // Cast DownloadTaskStatus to DownloadQueueStatus (they have identical values)
        entity.status = task.status as unknown as DownloadQueueStatus;
        entity.errorMessage = task.error?.message || '';
        entity.createdAt = dayjs(task.createdAt);
        entity.updatedAt = dayjs(task.updatedAt);

        // Set defaults for fields not present in DownloadTask
        entity.progressPercent = 0;
        entity.metadata = {};
        entity.filePath = '';

        return entity;
    }
}
