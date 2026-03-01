/**
 * Transcription entity: list of utterances (raw ASR output) and model metadata per encounter.
 * Only utterances (Utterance[]) and modelName, modelVersion; no server-side analysis.
 * Time coherence: Utterance.startTime and endTime are in milliseconds from recording start (same time base as ProsodyMetrics VoiceFrame and Encounter.totalDuration).
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Encounter } from './Encounter';

/** One speech unit; raw Whisper (or ASR) output. startTime/endTime in milliseconds from recording start. */
export class Utterance {
    constructor(
        public id: string,
        public startTime: number,
        public endTime: number,
        public text: string,
        public speakerLabel: string,
        public confidence: number,
    ) {}
}

@Entity({ tableName: 'transcriptions' })
export class Transcription extends AbstractEntity {
    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    /** ASR model name (e.g. whisper-small-en). */
    @Column({ default: '', type: 'varchar', length: 64 })
    public modelName!: string;

    /** ASR model version (e.g. 3.1). */
    @Column({ default: '', type: 'varchar', length: 16 })
    public modelVersion!: string;

    /** Time-series of utterances (raw Whisper/ASR output). */
    @Column({ default: '[]', type: 'text', as: 'json', fullText: true, fullTextPath: '$.text' })
    public utterances!: Utterance[];

    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    public getEncounterId(): string {
        return this.encounterId;
    }

    public getModelName(): string {
        return this.modelName;
    }

    public getModelVersion(): string {
        return this.modelVersion;
    }

    public getUtterances(): Utterance[] {
        return this.utterances;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public setModelName(value: string): void {
        this.modelName = value;
    }

    public setModelVersion(value: string): void {
        this.modelVersion = value;
    }

    public setUtterances(value: Utterance[]): void {
        this.utterances = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }
}
