/**
 * Encounter entity: property declarations with visibility; @Column on the property.
 * Normal encounter = therapist (1 biocode) + 1 subject (1 biocode); can store more (e.g. couple).
 * Server identifies who is who (e.g. by biocode frequency). No uuid stored.
 */

import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { EncounterStatus, type DetectedSpeakerProfile, type TranscriptSegment } from './Type';

@Entity({ table_name: 'encounters' })
export class Encounter extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4() })
    private uuid!: string;

    @Column({ default: '' })
    private therapistId!: string;

    /** Hashed biocodes: therapist (1) + 1+ subjects. Server assigns roles (e.g. by frequency). */
    @Column({ default: [] })
    private participantBiocodes!: string[];

    @Column({ default: [] })
    private audioFragments!: string[];

    @Column({ default: 0 })
    private totalDuration!: number;

    @Column({ default: EncounterStatus.RECORDING })
    private status!: EncounterStatus;

    @Column({ default: () => Date.now(), as: 'date' })
    private createdAt!: Date;

    @Column({ default: () => Date.now(), as: 'date' })
    private updatedAt!: Date;

    /** Stores JSON array of TranscriptSegment */
    @Column({ default: '[]' })
    private transcript!: string;

    /** Stores JSON array of DetectedSpeakerProfile */
    @Column({ default: '[]' })
    private detectedSpeakers!: string;

    public getUuid(): string {
        return this.getField<string>('uuid') as string;
    }

    public setUuid(value: string): void {
        this.setField('uuid', value);
    }

    public getTherapistId(): string {
        return this.getField<string>('therapistId') as string;
    }

    public setTherapistId(value: string): void {
        this.setField('therapistId', value);
    }

    public getParticipantBiocodes(): string[] {
        return this.getField<string[]>('participantBiocodes') as string[];
    }

    public setParticipantBiocodes(value: string[]): void {
        this.setField('participantBiocodes', value);
    }

    public getAudioFragments(): string[] {
        return this.getField<string[]>('audioFragments') as string[];
    }

    public setAudioFragments(value: string[]): void {
        this.setField('audioFragments', value);
    }

    public getTotalDuration(): number {
        return this.getField<number>('totalDuration') as number;
    }

    public setTotalDuration(value: number): void {
        this.setField('totalDuration', value);
    }

    public getStatus(): EncounterStatus {
        return this.getField<EncounterStatus>('status') as EncounterStatus;
    }

    public setStatus(value: EncounterStatus): void {
        this.setField('status', value);
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

    public getTranscript(): string {
        return this.getField<string>('transcript') as string;
    }

    public setTranscript(value: string): void {
        this.setField('transcript', value);
    }

    public getDetectedSpeakers(): string {
        return this.getField<string>('detectedSpeakers') as string;
    }

    public setDetectedSpeakers(value: string): void {
        this.setField('detectedSpeakers', value);
    }

    public get parsedTranscript(): TranscriptSegment[] {
        try {
            const parsed = JSON.parse(this.transcript) as unknown;
            return Array.isArray(parsed) ? (parsed as TranscriptSegment[]) : [];
        } catch {
            return [];
        }
    }

    public get parsedSpeakers(): DetectedSpeakerProfile[] {
        try {
            const parsed = JSON.parse(this.detectedSpeakers) as unknown;
            return Array.isArray(parsed) ? (parsed as DetectedSpeakerProfile[]) : [];
        } catch {
            return [];
        }
    }

    public get createdAtDate(): Date {
        return this.createdAt;
    }

    public get updatedAtDate(): Date {
        return this.updatedAt;
    }

    public set parsedTranscript(value: TranscriptSegment[]) {
        this.transcript = JSON.stringify(value);
    }

    public set parsedSpeakers(value: DetectedSpeakerProfile[]) {
        this.detectedSpeakers = JSON.stringify(value);
    }

    public addAudioFragment(path: string, durationMs: number): void {
        this.audioFragments = [...this.audioFragments, path];
        this.totalDuration = this.totalDuration + durationMs;
    }

    /** Set participant biocodes from raw biocodes + projection key (hashes each). */
    public setParticipantBiocodesFromRaw(rawBiocodes: string[], projectionKey: string): void {
        this.setParticipantBiocodes(
            rawBiocodes.map((raw) => CryptoJS.HmacSHA256(raw, projectionKey).toString()),
        );
    }
}
