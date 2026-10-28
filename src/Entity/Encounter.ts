/**
 * Encounter entity: metadata only. Transcript and prosody live in Transcription / ProsodyMetrics.
 * Patients live in Patient entity (join on encounterId): biocode from local processing, serverPatientUuid from server recognition. No names.
 * isIncognito (Bunker): when true, transcript is stored encrypted on the server.
 */

import { defineEntity, p } from '@mikro-orm/core';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { DayjsType } from '@/Database/DayjsType';
import { EncounterRepository } from '@/Repository/EncounterRepository';
import { Therapist } from './Therapist';
import { EncounterStatus } from './Type';

dayjs.extend(utc);

const SESSION_PREFIX = 'encounter';

const EncounterSchema = defineEntity({
    name: 'Encounter',
    tableName: 'encounters',
    repository: () => EncounterRepository,
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        /** UTC, stored as ISO string; use dayjs in UTC mode. */
        createdAt: p.type(DayjsType).index().onCreate(() => dayjs.utc()),
        /** File paths to encrypted audio chunks. */
        encryptedAudioPaths: p.json<string[]>().onCreate(() => []),
        /** Incognito (Bunker): when true, transcript is stored encrypted on the server. */
        isIncognito: p.boolean().default(false).index(),
        status: p.enum(() => EncounterStatus).default(EncounterStatus.Recording).index(),
        /** UTC when this encounter was synced to cloud (null = not synced). */
        syncedAt: p.type(DayjsType).nullable(),
        /** References Therapist (UUID). Real column for REFERENCES constraint. */
        therapistId: p.manyToOne(Therapist).deleteRule('restrict').mapToPk(),
        /** Duration in milliseconds (whole number). */
        totalDuration: p.integer().default(0),
        /** UTC, stored as ISO string; use dayjs in UTC mode. */
        updatedAt: p.type(DayjsType).index().onCreate(() => dayjs.utc()).onUpdate(() => dayjs.utc()),
    },
});

export class Encounter extends EncounterSchema.class {
    public constructor(data: Partial<Encounter> = {}) {
        super();
        this.uuid = data.uuid ?? uuidv4();
        this.createdAt = data.createdAt ?? dayjs.utc();
        this.encryptedAudioPaths = data.encryptedAudioPaths ?? [];
        this.isIncognito = data.isIncognito ?? false;
        this.status = data.status ?? EncounterStatus.Recording;
        this.syncedAt = data.syncedAt ?? null;
        this.therapistId = data.therapistId ?? '';
        this.totalDuration = data.totalDuration ?? 0;
        this.updatedAt = data.updatedAt ?? dayjs.utc();
    }

    public addEncryptedAudioPath(path: string): void {
        this.encryptedAudioPaths = [...this.encryptedAudioPaths, path];
    }

    /**
     * Returns the session ID for SecureRecorder.
     * Format: encounter-{uuid}
     */
    public getSessionId(): string {
        return `${SESSION_PREFIX}-${this.uuid}`;
    }

    /** Add an encrypted audio path and optionally update total duration. */
    public addEncryptedAudioPathWithDuration(path: string, durationMs: number): void {
        this.addEncryptedAudioPath(path);
        this.totalDuration = this.totalDuration + durationMs;
    }

    public getCreatedAt(): Dayjs {
        return this.createdAt;
    }

    public getEncryptedAudioPaths(): string[] {
        return this.encryptedAudioPaths;
    }

    public getIsIncognito(): boolean {
        return this.isIncognito;
    }

    public getStatus(): EncounterStatus {
        return this.status;
    }

    public getSyncedAt(): Dayjs | null {
        return this.syncedAt ?? null;
    }

    public getTherapistId(): string {
        return this.therapistId;
    }

    public getTotalDuration(): number {
        return this.totalDuration;
    }

    public getUpdatedAt(): Dayjs {
        return this.updatedAt;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public removeEncryptedAudioPath(path: string): void {
        this.encryptedAudioPaths = this.encryptedAudioPaths.filter((p) => p !== path);
    }

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public setEncryptedAudioPaths(value: string[]): void {
        this.encryptedAudioPaths = value;
    }

    public setIsIncognito(value: boolean): void {
        this.isIncognito = value;
    }

    public setStatus(value: EncounterStatus): void {
        this.status = value;
    }

    public setSyncedAt(value: Dayjs | null): void {
        this.syncedAt = value;
    }

    public setTherapistId(value: string): void {
        this.therapistId = value;
    }

    public setTotalDuration(value: number): void {
        this.totalDuration = value;
    }

    public setUpdatedAt(value: Dayjs): void {
        this.updatedAt = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }

    public static create(therapistId: string, isIncognito = false): Encounter {
        return new Encounter({
            therapistId,
            isIncognito,
        });
    }
}

EncounterSchema.setClass(Encounter);
