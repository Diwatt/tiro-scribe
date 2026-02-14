/**
 * DiscourseMetrics entity: discourse/sentiment analytics per encounter.
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Encounter } from './Encounter';

@Entity({ tableName: 'discourse_metrics' })
export class DiscourseMetrics extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    /** References Encounter (UUID). Real column for REFERENCES + ON DELETE CASCADE. */
    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    @Column({ default: 0, type: 'real' })
    public sentimentScore!: number;

    @Column({ default: '', type: 'varchar' })
    public primaryEmotion!: string;

    @Column({ default: '[]', type: 'text', as: 'json' })
    public topics!: string[];
}
