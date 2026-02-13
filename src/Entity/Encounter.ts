/**
 * Encounter entity: metadata only. Transcript and prosody live in Transcription / ProsodyMetrics.
 * Normal encounter = therapist (1 biocode) + 1 subject (1 biocode); can store more (e.g. couple).
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import QuickCrypto, { Buffer } from 'react-native-quick-crypto';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { ForeignKey } from '../Database/ForeignKey';
import { EncounterStatus } from './Type';
import { Therapist } from './Therapist';

dayjs.extend(utc);

@Entity({ tableName: 'encounters' })
export class Encounter extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    private uuid!: string;

    /** References Therapist (UUID). Real column for REFERENCES constraint. */
    @ForeignKey({ target: () => Therapist, onDelete: 'RESTRICT' })
    @Column({ default: '', type: 'varchar', length: 36 })
    private therapistId!: string;

    /** Hashed biocodes: therapist (1) + 1+ subjects. Server assigns roles (e.g. by frequency). */
    @Column({ default: '[]', type: 'text', as: 'json' })
    private participantBiocodes!: string[];

    /** File paths to encrypted audio chunks. */
    @Column({ default: '[]', type: 'text', as: 'json' })
    private encryptedAudioPaths!: string[];

    /** Duration in milliseconds (whole number). */
    @Column({ default: 0, type: 'integer' })
    private totalDuration!: number;

    @Column({ default: EncounterStatus.Recording, type: 'varchar', length: 16, index: true })
    private status!: EncounterStatus;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date', index: true })
    private createdAt!: Dayjs;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date', index: true })
    private updatedAt!: Dayjs;

    public getUuid(): string {
        return this.uuid;
    }

    public getTherapistId(): string {
        return this.therapistId;
    }

    public setTherapistId(value: string): void {
        this.therapistId = value;
    }

    public getParticipantBiocodes(): string[] {
        return this.participantBiocodes;
    }

    public setParticipantBiocodes(value: string[]): void {
        this.participantBiocodes = value;
    }

    public addParticipantBiocode(item: string): void {
        this.setParticipantBiocodes([...this.getParticipantBiocodes(), item]);
    }

    public removeParticipantBiocode(item: string): void {
        this.setParticipantBiocodes(this.getParticipantBiocodes().filter((b) => b !== item));
    }

    public getEncryptedAudioPaths(): string[] {
        return this.encryptedAudioPaths;
    }

    public setEncryptedAudioPaths(value: string[]): void {
        this.encryptedAudioPaths = value;
    }

    public addEncryptedAudioPath(path: string): void {
        this.setEncryptedAudioPaths([...this.getEncryptedAudioPaths(), path]);
    }

    public removeEncryptedAudioPath(path: string): void {
        this.setEncryptedAudioPaths(this.getEncryptedAudioPaths().filter((p) => p !== path));
    }

    public getTotalDuration(): number {
        return this.totalDuration;
    }

    public setTotalDuration(value: number): void {
        this.totalDuration = value;
    }

    public getStatus(): EncounterStatus {
        return this.status;
    }

    public setStatus(value: EncounterStatus): void {
        this.status = value;
    }

    public getCreatedAt(): Dayjs {
        return this.createdAt;
    }

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public getUpdatedAt(): Dayjs {
        return this.updatedAt;
    }

    public setUpdatedAt(value: Dayjs): void {
        this.updatedAt = value;
    }

    /** Add an encrypted audio path and optionally update total duration. */
    public addEncryptedAudioPathWithDuration(path: string, durationMs: number): void {
        this.addEncryptedAudioPath(path);
        this.setTotalDuration(this.getTotalDuration() + durationMs);
    }

    /** Set participant biocodes from raw biocodes + projection key (hashes each). */
    public setParticipantBiocodesFromRaw(rawBiocodes: string[], projectionKey: string): void {
        const keyBuf = Buffer.from(projectionKey, 'hex');
        this.setParticipantBiocodes(rawBiocodes.map((raw) => QuickCrypto.createHmac('sha256', keyBuf).update(raw, 'utf8').digest('hex')));
    }
}
