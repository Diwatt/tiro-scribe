/**
 * Encounter entity: property declarations with visibility; @Column on the property.
 * Normal encounter = therapist (1 biocode) + 1 subject (1 biocode); can store more (e.g. couple).
 * Server identifies who is who (e.g. by biocode frequency). No uuid stored.
 */

import CryptoJS from 'crypto-js';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Database/Decorators';
import { EncounterStatus } from './Type';

@Entity({ table_name: 'encounters' })
export class Encounter extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => crypto.randomUUID() })
    public uuid!: string;

    @Column({ default: '' })
    public therapistId!: string;

    /** Hashed biocodes: therapist (1) + 1+ subjects. Server assigns roles (e.g. by frequency). */
    @Column({ default: [] })
    public participantBiocodes!: string[];

    @Column({ default: [] })
    public audioFragments!: string[];

    @Column({ default: 0 })
    public totalDuration!: number;

    @Column({ default: EncounterStatus.RECORDING, observable: true })
    public status!: EncounterStatus;

    @Column({ default: () => Date.now(), as: 'date', observable: true })
    public createdAt!: Date;

    @Column({ default: () => Date.now(), as: 'date', observable: true })
    public updatedAt!: Date;

    public get createdAtDate(): Date {
        return this.createdAt;
    }

    public get updatedAtDate(): Date {
        return this.updatedAt;
    }

    public addAudioFragment(path: string, durationMs: number): void {
        this.audioFragments = [...this.audioFragments, path];
        this.totalDuration = this.totalDuration + durationMs;
    }

    /** Set participant biocodes from raw biocodes + projection key (hashes each). */
    public setParticipantBiocodes(rawBiocodes: string[], projectionKey: string): void {
        this.participantBiocodes = rawBiocodes.map((raw) =>
            CryptoJS.HmacSHA256(raw, projectionKey).toString(),
        );
    }
}
