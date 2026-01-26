/**
 * Subject Entity
 * Entity class for subject/patient records
 * Uses biocode (hashed identity) for privacy-preserving tracking
 */

import {AbstractEntity} from './AbstractEntity';

/**
 * Subject Schema Type
 */
export interface SubjectSchema {
    id: string;
    uuid: string;
    biocode: string;
    therapistId: string;
    createdAt: number;
    updatedAt: number;
}

export type NewSubjectSchema = Omit<SubjectSchema, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Subject Entity Class
 * Provides business logic and helper methods for subject records
 */
export class Subject extends AbstractEntity<SubjectSchema> {
    public readonly id: string;
    public readonly uuid: string;
    public readonly biocode: string;
    public readonly therapistId: string;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(data: SubjectSchema) {
        super(data);
        this.id = data.id;
        this.uuid = data.uuid;
        this.biocode = data.biocode;
        this.therapistId = data.therapistId;
        this.createdAt = new Date(data.createdAt);
        this.updatedAt = new Date(data.updatedAt);
    }

}
