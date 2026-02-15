/**
 * ProsodyMetrics entity: raw physical signal time-series per encounter.
 * Only voiceFrames (VoiceFrame[]) and model metadata (modelName, modelVersion).
 * No global stats (pitchMean, jitterPercent, speakingRate, etc.); analysis is server-side.
 * Time coherence: VoiceFrame.startTime and duration are in milliseconds from recording start;
 * segmentId links to Utterance.id; frame interval [startTime, startTime+duration] should lie inside utterance [startTime, endTime].
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Encounter } from './Encounter';

/** One frame of raw signal metrics (F0, RMS, stability, timbre, periodicity). No derived/semantic fields. */
export class VoiceFrame {
    constructor(
        public startTime: number,
        public duration: number,
        public pitch: number,
        public energy: number,
        public spectralTilt: number,
        /** Periodicity [0–1] from pitch tracker (voicedness/voicing confidence). */
        public periodicity: number,
        public segmentId?: string,
    ) {}
}

@Entity({ tableName: 'prosody_metrics' })
export class ProsodyMetrics extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    /** Model name (e.g. silero-vad). */
    @Column({ default: '', type: 'varchar', length: 64 })
    public modelName!: string;

    /** Model version (e.g. 4.0.0). */
    @Column({ default: '', type: 'varchar', length: 16 })
    public modelVersion!: string;

    /** Time-series of raw signal frames (JSON). */
    @Column({ default: '[]', type: 'text', as: 'json' })
    public voiceFrames!: VoiceFrame[];

    public getEncounterId(): string {
        return this.encounterId;
    }

    public getModelName(): string {
        return this.modelName;
    }

    public getModelVersion(): string {
        return this.modelVersion;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public getVoiceFrames(): VoiceFrame[] {
        return this.voiceFrames;
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

    public setUuid(value: string): void {
        this.uuid = value;
    }

    public setVoiceFrames(value: VoiceFrame[]): void {
        this.voiceFrames = value;
    }
}
