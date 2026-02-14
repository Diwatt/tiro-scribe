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
}
