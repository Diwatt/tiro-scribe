/**
 * ProsodyMetrics entity: raw physical signal time-series per encounter.
 * Only voiceFrames (VoiceFrame[]) and model metadata (modelName, modelVersion).
 * No global stats (pitchMean, jitterPercent, speakingRate, etc.); analysis is server-side.
 * Time coherence: VoiceFrame.startTime and duration are in milliseconds from recording start;
 * segmentId links to Utterance.id; frame interval [startTime, startTime+duration] should lie inside utterance [startTime, endTime].
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { defineEntity, p } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { Encounter } from './Encounter';

/** One frame of raw signal metrics (F0, RMS, stability, timbre, periodicity). No derived/semantic fields. */
export class VoiceFrame {
    public constructor(
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

const ProsodyMetricsSchema = defineEntity({
    name: 'ProsodyMetrics',
    tableName: 'prosody_metrics',
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        encounterId: p.manyToOne(Encounter).deleteRule('cascade').mapToPk(),
        /** Model name (e.g. silero-vad). */
        modelName: p.string().length(64).default(''),
        /** Model version (e.g. 4.0.0). */
        modelVersion: p.string().length(16).default(''),
        /** Time-series of raw signal frames (JSON). */
        voiceFrames: p.json<VoiceFrame[]>().onCreate(() => []),
    },
});

export class ProsodyMetrics extends ProsodyMetricsSchema.class {
    public constructor(data: Partial<ProsodyMetrics> = {}) {
        super();
        this.uuid = data.uuid ?? uuidv4();
        this.encounterId = data.encounterId ?? '';
        this.modelName = data.modelName ?? '';
        this.modelVersion = data.modelVersion ?? '';
        this.voiceFrames = data.voiceFrames ?? [];
    }

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

ProsodyMetricsSchema.setClass(ProsodyMetrics);
