/**
 * Encounter entity: metadata only. Transcript and prosody live in Transcription / ProsodyMetrics.
 * Patients live in Patient entity (join on encounterId): biocode from local processing, serverPatientUuid from server recognition. No names.
 * isIncognito (Bunker): when true, transcript is stored encrypted on the server.
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Therapist } from './Therapist';
import { EncounterStatus } from './Type';

dayjs.extend(utc);

@Entity({ tableName: 'encounters' })
export class Encounter extends AbstractEntity {
    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date', index: true })
    public createdAt!: Dayjs;

    /** File paths to encrypted audio chunks. */
    @Column({ default: '[]', type: 'text', as: 'json' })
    public encryptedAudioPaths!: string[];

    /** Incognito (Bunker): when true, transcript is stored encrypted on the server. */
    @Column({ default: false, type: 'boolean', index: true })
    public isIncognito!: boolean;

    @Column({ default: EncounterStatus.Recording, type: 'varchar', length: 16, index: true })
    public status!: EncounterStatus;

    /** UTC when this encounter was synced to cloud (null = not synced). */
    @Column({ default: null, type: 'datetime', as: 'date' })
    public syncedAt!: Dayjs | null;

    /** References Therapist (UUID). Real column for REFERENCES constraint. */
    @ForeignKey({ target: () => Therapist, onDelete: 'RESTRICT' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public therapistId!: string;

    /** Duration in milliseconds (whole number). */
    @Column({ default: 0, type: 'integer' })
    public totalDuration!: number;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date', index: true })
    public updatedAt!: Dayjs;

    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    public addEncryptedAudioPath(path: string): void {
        this.encryptedAudioPaths = [...this.encryptedAudioPaths, path];
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
        return this.syncedAt;
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
