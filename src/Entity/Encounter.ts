/**
 * Encounter entity: metadata only. Transcript and prosody live in Transcription / ProsodyMetrics.
 * Participants = therapist + 1+ clients (solo, couple, family). All stored in participantBiocodes.
 * Therapist's biocode is stored once on Therapist (set at calibration); use getClientBiocodes(therapist.biocode) to get client-only list.
 * Incognito (Bunker): isIncognito true, patientAlias is display id (e.g. PATIENT_AXZD).
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import QuickCrypto, { Buffer } from 'react-native-quick-crypto';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Therapist } from './Therapist';
import { EncounterStatus } from './Type';

dayjs.extend(utc);

@Entity({ tableName: 'encounters' })
export class Encounter extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    /** References Therapist (UUID). Real column for REFERENCES constraint. */
    @ForeignKey({ target: () => Therapist, onDelete: 'RESTRICT' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public therapistId!: string;

    /** Projected-voice biocodes of all participants (therapist + 1+ clients). From Biocode service. */
    @Column({ default: '[]', type: 'text', as: 'json' })
    public participantBiocodes!: string[];

    /** File paths to encrypted audio chunks. */
    @Column({ default: '[]', type: 'text', as: 'json' })
    public encryptedAudioPaths!: string[];

    /** Duration in milliseconds (whole number). */
    @Column({ default: 0, type: 'integer' })
    public totalDuration!: number;

    @Column({ default: EncounterStatus.Recording, type: 'varchar', length: 16, index: true })
    public status!: EncounterStatus;

    /** Incognito (Ministre) mode: when true, patient is anonymized (patientAlias used). */
    @Column({ default: false, type: 'boolean', index: true })
    public isIncognito!: boolean;

    /** When isIncognito: anonymized patient id (e.g. PATIENT_AXZD). */
    @Column({ default: null, type: 'varchar', length: 32 })
    public patientAlias!: string | null;

    /** UTC when this encounter was synced to cloud (null = not synced). */
    @Column({ default: null, type: 'datetime', as: 'date' })
    public syncedAt!: Dayjs | null;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date', index: true })
    public createdAt!: Dayjs;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date', index: true })
    public updatedAt!: Dayjs;

    public addParticipantBiocode(item: string): void {
        this.participantBiocodes = [...this.participantBiocodes, item];
    }

    public removeParticipantBiocode(item: string): void {
        this.participantBiocodes = this.participantBiocodes.filter((b) => b !== item);
    }

    /** Client biocodes only (participants minus therapist). Pass therapist.biocode from Therapist; if omitted, returns all participants. */
    public getClientBiocodes(therapistBiocode?: string | null): string[] {
        if (therapistBiocode == null || therapistBiocode === '') {
            return [...this.participantBiocodes];
        }
        return this.participantBiocodes.filter((b) => b !== therapistBiocode);
    }

    public addEncryptedAudioPath(path: string): void {
        this.encryptedAudioPaths = [...this.encryptedAudioPaths, path];
    }

    public removeEncryptedAudioPath(path: string): void {
        this.encryptedAudioPaths = this.encryptedAudioPaths.filter((p) => p !== path);
    }

    /** Add an encrypted audio path and optionally update total duration. */
    public addEncryptedAudioPathWithDuration(path: string, durationMs: number): void {
        this.addEncryptedAudioPath(path);
        this.totalDuration = this.totalDuration + durationMs;
    }

    /** Set participant biocodes from raw biocodes + projection key (hashes each). */
    public setParticipantBiocodesFromRaw(rawBiocodes: string[], projectionKey: string): void {
        const keyBuf = Buffer.from(projectionKey, 'hex');
        this.participantBiocodes = rawBiocodes.map((raw) => QuickCrypto.createHmac('sha256', keyBuf).update(raw, 'utf8').digest('hex'));
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

    public getParticipantBiocodes(): string[] {
        return this.participantBiocodes;
    }

    public getPatientAlias(): string | null {
        return this.patientAlias;
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

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public setEncryptedAudioPaths(value: string[]): void {
        this.encryptedAudioPaths = value;
    }

    public setIsIncognito(value: boolean): void {
        this.isIncognito = value;
    }

    public setParticipantBiocodes(value: string[]): void {
        this.participantBiocodes = value;
    }

    public setPatientAlias(value: string | null): void {
        this.patientAlias = value;
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
}
