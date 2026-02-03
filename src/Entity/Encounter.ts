/**
 * Encounter entity: property declarations with visibility; @Column on the property.
 * Normal encounter = therapist (1 biocode) + 1 subject (1 biocode); can store more (e.g. couple).
 * Server identifies who is who (e.g. by biocode frequency). No uuid stored.
 */

import type { Dayjs } from 'dayjs';
import CryptoJS from 'crypto-js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import {
    EncounterStatus,
    type DetectedSpeakerProfile,
    type TranscriptSegment,
} from './Type';

dayjs.extend(utc);

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

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), as: 'date' })
    private createdAt!: Dayjs;

    /** UTC, stored as ISO string; use dayjs in UTC mode. */
    @Column({ default: () => dayjs.utc().toISOString(), as: 'date' })
    private updatedAt!: Dayjs;

    /** JSON array of TranscriptSegment (stored as string, transformed via 'json'). */
    @Column({ default: '[]', as: 'json' })
    private transcript!: TranscriptSegment[];

    /** JSON array of DetectedSpeakerProfile (stored as string, transformed via 'json'). */
    @Column({ default: '[]', as: 'json' })
    private detectedSpeakers!: DetectedSpeakerProfile[];

    public getUuid(): string {
        return this.uuid;
    }

    public getTherapistId(): string {
        return this.therapistId;
    }

    public setTherapistId(value: string): void {
        this.therapistId = value;
    }

    /** getProps for array participantBiocodes */
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

    /** getProps for array audioFragments */
    public getAudioFragments(): string[] {
        return this.audioFragments;
    }

    public setAudioFragments(value: string[]): void {
        this.audioFragments = value;
    }

    public addAudioFragment(path: string): void {
        this.setAudioFragments([...this.getAudioFragments(), path]);
    }

    public removeAudioFragment(path: string): void {
        this.setAudioFragments(this.getAudioFragments().filter((p) => p !== path));
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

    public getTranscript(): TranscriptSegment[] {
        return this.transcript;
    }

    public setTranscript(value: TranscriptSegment[]): void {
        this.transcript = value;
    }

    public getDetectedSpeakers(): DetectedSpeakerProfile[] {
        return this.detectedSpeakers;
    }

    public setDetectedSpeakers(value: DetectedSpeakerProfile[]): void {
        this.detectedSpeakers = value;
    }

    /** Add an audio fragment and optionally update total duration. */
    public addAudioFragmentWithDuration(path: string, durationMs: number): void {
        this.addAudioFragment(path);
        this.setTotalDuration(this.getTotalDuration() + durationMs);
    }

    /** Set participant biocodes from raw biocodes + projection key (hashes each). */
    public setParticipantBiocodesFromRaw(rawBiocodes: string[], projectionKey: string): void {
        this.setParticipantBiocodes(
            rawBiocodes.map((raw) => CryptoJS.HmacSHA256(raw, projectionKey).toString()),
        );
    }
}
