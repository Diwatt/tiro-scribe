/**
 * Transcription entity: list of utterances (raw ASR output) and model metadata per encounter.
 * Only utterances (Utterance[]) and modelName, modelVersion; no server-side analysis.
 * Time coherence: Utterance.startTime and endTime are in milliseconds from recording start (same time base as ProsodyMetrics VoiceFrame and Encounter.totalDuration).
 * One-to-one with Encounter; cascade delete when encounter is removed.
 */

import { defineEntity, p } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { Encounter } from './Encounter';

/** One speech unit; raw Whisper (or ASR) output. startTime/endTime in milliseconds from recording start. */
export class Utterance {
    public constructor(
        public id: string,
        public startTime: number,
        public endTime: number,
        public text: string,
        public speakerLabel: string,
        public confidence: number,
    ) {}
}

const TranscriptionSchema = defineEntity({
    name: 'Transcription',
    tableName: 'transcriptions',
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        encounterId: p.manyToOne(Encounter).deleteRule('cascade').mapToPk(),
        /** ASR model name (e.g. whisper-small-en). */
        modelName: p.string().length(64).default(''),
        /** ASR model version (e.g. 3.1). */
        modelVersion: p.string().length(16).default(''),
        /** Time-series of utterances (raw Whisper/ASR output). */
        utterances: p.json<Utterance[]>().onCreate(() => []),
    },
});

export class Transcription extends TranscriptionSchema.class {
    public constructor(data: Partial<Transcription> = {}) {
        super();
        this.uuid = data.uuid ?? uuidv4();
        this.encounterId = data.encounterId ?? '';
        this.modelName = data.modelName ?? '';
        this.modelVersion = data.modelVersion ?? '';
        this.utterances = data.utterances ?? [];
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

TranscriptionSchema.setClass(Transcription);
