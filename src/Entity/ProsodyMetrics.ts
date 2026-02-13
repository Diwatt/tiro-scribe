/**
 * ProsodyMetrics entity: analytics per encounter (pitch, speaking rate, coherence).
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { ForeignKey } from '../Database/ForeignKey';
import { Encounter } from './Encounter';

@Entity({ tableName: 'prosody_metrics' })
export class ProsodyMetrics extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    private uuid!: string;

    /** References Encounter (UUID). Real column for REFERENCES + ON DELETE CASCADE. */
    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    private encounterId!: string;

    @Column({ default: 0, type: 'real' })
    private pitchMean!: number;

    @Column({ default: 0, type: 'real' })
    private speakingRate!: number;

    @Column({ default: 0, type: 'real' })
    private coherence!: number;

    public getUuid(): string {
        return this.uuid;
    }

    public getEncounterId(): string {
        return this.encounterId;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public getPitchMean(): number {
        return this.pitchMean;
    }

    public setPitchMean(value: number): void {
        this.pitchMean = value;
    }

    public getSpeakingRate(): number {
        return this.speakingRate;
    }

    public setSpeakingRate(value: number): void {
        this.speakingRate = value;
    }

    public getCoherence(): number {
        return this.coherence;
    }

    public setCoherence(value: number): void {
        this.coherence = value;
    }
}
