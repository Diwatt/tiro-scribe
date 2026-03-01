/**
 * Patient entity: one row per patient (client) in an encounter.
 * Join with Encounter via encounterId. Local processing yields biocode; server recognition yields serverPatientUuid.
 * No names stored. Therapist is on Encounter.therapistId, not in this table.
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { ForeignKey } from '../Database/Decorator';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { Encounter } from './Encounter';

dayjs.extend(utc);

@Entity({ tableName: 'patients' })
export class Patient extends AbstractEntity {
    /** Projected-voice biocode (from Biocode service). */
    @Column({ default: '', type: 'varchar', length: 64 })
    public biocode!: string;

    /** UTC, stored as ISO string. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    public createdAt!: Dayjs;

    @ForeignKey({ target: () => Encounter, onDelete: 'CASCADE' })
    @Column({ default: '', type: 'varchar', length: 36 })
    public encounterId!: string;

    /** Server-assigned patient UUID after recognition; null until then. */
    @Column({ default: null, type: 'varchar', length: 36 })
    public serverPatientUuid!: string | null;

    /** UTC, stored as ISO string. */
    @Column({ default: () => dayjs.utc().toISOString(), type: 'datetime', as: 'date' })
    public updatedAt!: Dayjs;

    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

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
        return this.serverPatientUuid;
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
