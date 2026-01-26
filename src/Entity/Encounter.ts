/**
 * Encounter Entity
 * Entity class for encounter records
 * Links subjects and therapists with session metadata
 */

import {AbstractEntity} from './AbstractEntity';

/**
 * Encounter status enum
 */
export enum EncounterStatus {
    SCHEDULED = 'SCHEDULED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * Encounter Schema Type
 */
export interface EncounterSchema {
    id: string;
    uuid: string;
    subjectId: string;
    therapistId: string;
    status: string;
    startDate: number;
    endDate: number | null;
    createdAt: number;
    updatedAt: number;
}

export type NewEncounterSchema = Omit<EncounterSchema, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Encounter Entity Class
 * Provides business logic and helper methods for encounter records
 */
export class Encounter extends AbstractEntity<EncounterSchema> {
    public readonly id: string;
    public readonly uuid: string;
    public readonly subjectId: string;
    public readonly therapistId: string;
    public readonly status: EncounterStatus;
    public readonly startDate: Date;
    public readonly endDate: Date | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(data: EncounterSchema) {
        super(data);
        this.id = data.id;
        this.uuid = data.uuid;
        this.subjectId = data.subjectId;
        this.therapistId = data.therapistId;
        this.status = data.status as EncounterStatus;
        this.startDate = new Date(data.startDate);
        this.endDate = data.endDate ? new Date(data.endDate) : null;
        this.createdAt = new Date(data.createdAt);
        this.updatedAt = new Date(data.updatedAt);
    }

    /**
     * Helper getter to check if encounter is active
     */
    public get isActive(): boolean {
        return this.status === EncounterStatus.IN_PROGRESS;
    }

    /**
     * Helper getter to check if encounter is completed
     */
    public get isCompleted(): boolean {
        return this.status === EncounterStatus.COMPLETED;
    }

    /**
     * Calculate encounter duration in milliseconds
     * Returns null if encounter hasn't ended
     */
    public get duration(): number | null {
        if (!this.endDate) {
            return null;
        }
        return this.endDate.getTime() - this.startDate.getTime();
    }

}
