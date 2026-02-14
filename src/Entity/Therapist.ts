/**
 * Therapist entity: pure domain object (schema + data).
 * Creation, unlock and recovery are in TherapistForge.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';

@Entity({ tableName: 'therapists', repositoryClass: 'TherapistRepository' })
export class Therapist extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    @Column({ default: '', type: 'varchar' })
    public email!: string;

    @Column({ default: null, type: 'varchar' })
    public name!: string | null;

    @Column({ default: '', type: 'text' })
    public passwordHash!: string;

    @Column({ default: null, type: 'varchar', length: 36 })
    public localKeyId!: string | null;

    @Column({ default: '', type: 'text' })
    public encryptedMasterKeyPrimary!: string;

    @Column({ default: '', type: 'text' })
    public encryptedMasterKeyRecovery!: string;

    @Column({ default: '', type: 'text' })
    public recoveryCodeHash!: string;

    @Column({ default: '', type: 'text' })
    public masterKeyCheckHash!: string;

    @Column({ default: '[]', type: 'text', as: 'json' })
    public languages!: string[];

    @Column({ default: '[]', type: 'text', as: 'json' })
    public biocodeEmbedding!: number[];

    /** Projected-voice biocode (hash from Biocode service). Set at calibration; same every encounter. */
    @Column({ default: null, type: 'varchar', length: 64 })
    public biocode!: string | null;

    @Column({ default: null, type: 'varchar' })
    public therapyMethod!: string | null;

    @Column({ default: null, type: 'varchar' })
    public qualification!: string | null;

    @Column({ default: null, type: 'integer' })
    public yearsOfExperience!: number | null;
}
