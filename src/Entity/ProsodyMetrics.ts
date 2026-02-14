/**
 * ProsodyMetrics entity: analytics per encounter (pitch, speaking rate, coherence).
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Encounter } from './Encounter';

@Entity({ tableName: 'prosody_metrics' })
export class ProsodyMetrics extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    @Column({ default: 0, type: 'real' })
    public pitchMean!: number;

    @Column({ default: 0, type: 'real' })
    public speakingRate!: number;

    @Column({ default: 0, type: 'real' })
    public coherence!: number;

    public getCoherence(): number {
        return this.coherence;
    }

    public getEncounterId(): string {
        return this.encounterId;
    }

    public getPitchMean(): number {
        return this.pitchMean;
    }

    public getSpeakingRate(): number {
        return this.speakingRate;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public setCoherence(value: number): void {
        this.coherence = value;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public setPitchMean(value: number): void {
        this.pitchMean = value;
    }

    public setSpeakingRate(value: number): void {
        this.speakingRate = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }
}
