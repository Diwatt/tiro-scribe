/**
 * DownloadQueue entity: dedicated table for inference model download tasks.
 * No polymorphic fields; only download‑specific properties.
 */

import { defineEntity, p } from '@mikro-orm/core';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { DayjsType } from '@/Database/DayjsType';
import { DownloadQueueRepository } from '@/Repository/DownloadQueueRepository';
import type { DownloadTask } from '../InferenceModel/Download/Type';
import { DownloadQueueStatus } from './Type';

dayjs.extend(utc);

const MAX_RETRY_COUNT = 3;

const DownloadQueueSchema = defineEntity({
    name: 'DownloadQueue',
    tableName: 'download_queue',
    repository: () => DownloadQueueRepository,
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        capability: p.string().length(64).default('').index(),
        createdAt: p.type(DayjsType).index().onCreate(() => dayjs.utc()),
        errorMessage: p.text().default(''),
        filePath: p.text().default(''),
        language: p.string().length(8).default('').index(),
        maxRetries: p.integer().default(3),
        metadata: p.json<Record<string, unknown>>().onCreate(() => ({})),
        nbRetries: p.integer().default(0),
        progressPercent: p.integer().default(0),
        status: p.enum(() => DownloadQueueStatus).default(DownloadQueueStatus.Pending).index(),
        updatedAt: p.type(DayjsType).onCreate(() => dayjs.utc()).onUpdate(() => dayjs.utc()),
    },
});

export class DownloadQueue extends DownloadQueueSchema.class {
    public constructor(data: Partial<DownloadQueue> = {}) {
        super();
        this.uuid = data.uuid ?? uuidv4();
        this.capability = data.capability ?? '';
        this.createdAt = data.createdAt ?? dayjs.utc();
        this.errorMessage = data.errorMessage ?? '';
        this.filePath = data.filePath ?? '';
        this.language = data.language ?? '';
        this.maxRetries = data.maxRetries ?? 3;
        this.metadata = data.metadata ?? {};
        this.nbRetries = data.nbRetries ?? 0;
        this.progressPercent = data.progressPercent ?? 0;
        this.status = data.status ?? DownloadQueueStatus.Pending;
        this.updatedAt = data.updatedAt ?? dayjs.utc();
    }

    /**
     * Helper for tests and in-memory helpers: return a queue entity in the
     * completed state for the given capability. The returned object is not
     * intended to be persisted.
     */
    public static createCompleted(capability: string): DownloadQueue {
        const entity = new DownloadQueue();
        entity.uuid = uuidv4();
        entity.capability = capability;
        entity.language = '';
        entity.status = DownloadQueueStatus.Completed;
        entity.progressPercent = 100;
        entity.nbRetries = 0;
        entity.maxRetries = 0;
        entity.errorMessage = '';
        entity.metadata = {};
        entity.filePath = '';
        entity.createdAt = dayjs.utc();
        entity.updatedAt = dayjs.utc();
        return entity;
    }

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

    public getCapability(): string {
        return this.capability;
    }

    public getCreatedAt(): Dayjs {
        return this.createdAt;
    }

    public getErrorMessage(): string {
        return this.errorMessage;
    }

    public getFilePath(): string {
        return this.filePath;
    }

    public getLanguage(): string {
        return this.language;
    }

    public getMaxRetries(): number {
        return this.maxRetries;
    }

    public getMetadata(): Record<string, unknown> {
        return this.metadata;
    }

    public getNbRetries(): number {
        return this.nbRetries;
    }

    public getProgressPercent(): number {
        return this.progressPercent;
    }

    public getStatus(): DownloadQueueStatus {
        return this.status;
    }

    public getUpdatedAt(): Dayjs {
        return this.updatedAt;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public get isProcessable(): boolean {
        if (this.status === DownloadQueueStatus.Pending) {
            return true;
        }
        if (this.status === DownloadQueueStatus.Failed && this.nbRetries < MAX_RETRY_COUNT) {
            return true;
        }
        return false;
    }

    public setCapability(value: string): void {
        this.capability = value;
    }

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public setErrorMessage(value: string): void {
        this.errorMessage = value;
    }

    public setFilePath(value: string): void {
        this.filePath = value;
    }

    public setLanguage(value: string): void {
        this.language = value;
    }

    public setMaxRetries(value: number): void {
        this.maxRetries = value;
    }

    public setMetadata(value: Record<string, unknown>): void {
        this.metadata = value;
    }

    public setNbRetries(value: number): void {
        this.nbRetries = value;
    }

    public setProgressPercent(value: number): void {
        this.progressPercent = value;
    }

    public setStatus(value: DownloadQueueStatus): void {
        this.status = value;
    }

    public setUpdatedAt(value: Dayjs): void {
        this.updatedAt = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }
}

DownloadQueueSchema.setClass(DownloadQueue);
