/**
 * Patient entity: one row per patient (client) in an encounter.
 * Join with Encounter via encounterId. Local processing yields biocode; server recognition yields serverPatientUuid.
 * No names stored. Therapist is on Encounter.therapistId, not in this table.
 */

import { defineEntity, p } from '@mikro-orm/core';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { DayjsType } from '@/Database/DayjsType';
import { Encounter } from './Encounter';

dayjs.extend(utc);

const PatientSchema = defineEntity({
    name: 'Patient',
    tableName: 'patients',
    properties: {
        /** Projected-voice biocode (from Biocode service). */
        biocode: p.string().length(64).default(''),
        /** UTC, stored as ISO string. */
        createdAt: p.type(DayjsType).onCreate(() => dayjs.utc()),
        encounterId: p.manyToOne(Encounter).deleteRule('cascade').mapToPk(),
        /** Server-assigned patient UUID after recognition; null until then. */
        serverPatientUuid: p.string().length(36).nullable(),
        /** UTC, stored as ISO string. */
        updatedAt: p.type(DayjsType).onCreate(() => dayjs.utc()),
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
    },
});

export class Patient extends PatientSchema.class {
    public constructor(data: Partial<Patient> = {}) {
        super();
        this.uuid = data.uuid ?? uuidv4();
        this.biocode = data.biocode ?? '';
        this.createdAt = data.createdAt ?? dayjs.utc();
        this.encounterId = data.encounterId ?? '';
        this.serverPatientUuid = data.serverPatientUuid ?? null;
        this.updatedAt = data.updatedAt ?? dayjs.utc();
    }

    public getBiocode(): string {
        return this.biocode;
    }

    public getCreatedAt(): Dayjs {
        return this.createdAt;
    }

    public getEncounterId(): string {
        return this.encounterId;
    }

    public getServerPatientUuid(): string | null {
        return this.serverPatientUuid ?? null;
    }

    public getUpdatedAt(): Dayjs {
        return this.updatedAt;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public setBiocode(value: string): void {
        this.biocode = value;
    }

    public setCreatedAt(value: Dayjs): void {
        this.createdAt = value;
    }

    public setEncounterId(value: string): void {
        this.encounterId = value;
    }

    public setServerPatientUuid(value: string | null): void {
        this.serverPatientUuid = value;
    }

    public setUpdatedAt(value: Dayjs): void {
        this.updatedAt = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }
}

PatientSchema.setClass(Patient);
