/**
 * QueueItem entity: a processing job for an Encounter.
 * Tracks the pipeline stage (transcribe → anonymize → sync) and execution state.
 * Created when an Encounter is marked ToProcess; removed when processing completes.
 */

import { defineEntity, p } from '@mikro-orm/core';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { DayjsType } from '@/Database/DayjsType';
import { QueueItemRepository } from '@/Repository/QueueItemRepository';
import { Encounter } from './Encounter';
import { PipelineStage, QueueItemStatus } from './Type';

dayjs.extend(utc);

const QueueItemSchema = defineEntity({
    name: 'QueueItem',
    tableName: 'queue_items',
    repository: () => QueueItemRepository,
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        createdAt: p.type(DayjsType).onCreate(() => dayjs.utc()),
        encounterId: p.manyToOne(Encounter).deleteRule('cascade').mapToPk(),
        encryptedAudioPath: p.text().default(''),
        errorMessage: p.text().default(''),
        maxRetries: p.integer().default(3),
        metadata: p.json<Record<string, unknown>>().onCreate(() => ({})),
        pipelineStage: p.enum(() => PipelineStage).default(PipelineStage.Waiting),
        priority: p.integer().default(1),
        processingOffset: p.integer().default(0),
        progressPercent: p.integer().default(0),
        retryCount: p.integer().default(0),
        status: p.enum(() => QueueItemStatus).default(QueueItemStatus.Pending),
        updatedAt: p.type(DayjsType).onCreate(() => dayjs.utc()).onUpdate(() => dayjs.utc()),
    },
});

export class QueueItem extends QueueItemSchema.class {
    public constructor(data: Partial<QueueItem> = {}) {
        super();
        this.uuid = data.uuid ?? uuidv4();
        this.createdAt = data.createdAt ?? dayjs.utc();
        this.encounterId = data.encounterId ?? '';
        this.encryptedAudioPath = data.encryptedAudioPath ?? '';
        this.errorMessage = data.errorMessage ?? '';
        this.maxRetries = data.maxRetries ?? 3;
        this.metadata = data.metadata ?? {};
        this.pipelineStage = data.pipelineStage ?? PipelineStage.Waiting;
        this.priority = data.priority ?? 1;
        this.processingOffset = data.processingOffset ?? 0;
        this.progressPercent = data.progressPercent ?? 0;
        this.retryCount = data.retryCount ?? 0;
        this.status = data.status ?? QueueItemStatus.Pending;
        this.updatedAt = data.updatedAt ?? dayjs.utc();
    }

    public get isProcessable(): boolean {
        if (this.status === QueueItemStatus.Pending) {
            return true;
        }
        if (this.status === QueueItemStatus.Failed && this.retryCount < this.maxRetries) {
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

QueueItemSchema.setClass(QueueItem);
