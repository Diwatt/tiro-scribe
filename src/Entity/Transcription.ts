/**
 * Transcription entity: segments and FTS-indexed full text per encounter.
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { ForeignKey } from '../Database/ForeignKey';
import type { TranscriptSegment } from './Type';
import { Encounter } from './Encounter';

@Entity({ tableName: 'transcriptions' })
export class Transcription extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    private uuid!: string;

    /** References Encounter (UUID). Real column for REFERENCES + ON DELETE CASCADE. */
    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    private encounterId!: string;

    /** JSON array of TranscriptSegment. FTS indexes each segment's .text. */
    @Column({ default: '[]', type: 'text', as: 'json', fullText: true, fullTextPath: '$.text' })
    private segments!: TranscriptSegment[];

    public getUuid(): string {
        return this.uuid;
    }

    public getEncounterId(): string {
        return this.encounterId;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public getSegments(): TranscriptSegment[] {
        return this.segments;
    }

    public setSegments(value: TranscriptSegment[]): void {
        this.segments = value;
    }
}
