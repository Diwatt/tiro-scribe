/**
 * Transcription entity: segments and FTS-indexed full text per encounter.
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Encounter } from './Encounter';
import type { TranscriptSegment } from './Type';

@Entity({ tableName: 'transcriptions' })
export class Transcription extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    @Column({ default: '[]', type: 'text', as: 'json', fullText: true, fullTextPath: '$.text' })
    public segments!: TranscriptSegment[];

    public getEncounterId(): string {
        return this.encounterId;
    }

    public getSegments(): TranscriptSegment[] {
        return this.segments;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public setSegments(value: TranscriptSegment[]): void {
        this.segments = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }
}
