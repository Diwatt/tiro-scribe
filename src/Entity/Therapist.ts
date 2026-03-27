/**
 * Therapist entity: pure domain object (schema + data).
 * Creation, unlock and recovery are in TherapistForge.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';

@Entity({ tableName: 'therapists', repositoryClass: 'TherapistRepository' })
export class Therapist extends AbstractEntity {
    /** Projected-voice biocode (vector stored as JSON array). Set at calibration; same every encounter. */
    @Column({ default: '[]', type: 'text', as: 'json' })
    public biocode!: number[];

    @Column({ default: '', type: 'varchar' })
    public email!: string;

    @Column({ default: '', type: 'text' })
    public encryptedMasterKeyPrimary!: string;

    @Column({ default: '', type: 'text' })
    public encryptedMasterKeyRecovery!: string;

    @Column({ default: '[]', type: 'text', as: 'json' })
    public languages!: string[];

    // TODO (Post-MVP) : Here we gonnna store the alias for the hardware key (Keystore/Secure Enclave).
    // It will be use to encrypt and decrypt the Master Key with biometrics interface (FaceID/TouchID) 
    // to avoid the therapist to retype his password on every app opening
    @Column({ default: null, type: 'varchar', length: 36 })
    public biometricKeyAlias!: string | null;

    @Column({ default: '', type: 'text' })
    public masterKeyCheckHash!: string;

    @Column({ default: null, type: 'varchar' })
    public name!: string | null;

    @Column({ default: '', type: 'text' })
    public passwordHash!: string;

    @Column({ default: null, type: 'varchar' })
    public qualification!: string | null;

    @Column({ default: '', type: 'text' })
    public recoveryCodeHash!: string;

    @Column({ default: null, type: 'varchar' })
    public therapyMethod!: string | null;

    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    public uuid!: string;

    @Column({ default: null, type: 'integer' })
    public yearsOfExperience!: number | null;

    public getBiocode(): number[] {
        return this.biocode;
    }

    public getEmail(): string {
        return this.email;
    }

    public getEncryptedMasterKeyPrimary(): string {
        return this.encryptedMasterKeyPrimary;
    }

    public getEncryptedMasterKeyRecovery(): string {
        return this.encryptedMasterKeyRecovery;
    }

    public getLanguages(): string[] {
        return this.languages;
    }

    public getBiometricKeyAlias(): string | null {
        return this.biometricKeyAlias;
    }

    public getMasterKeyCheckHash(): string {
        return this.masterKeyCheckHash;
    }

    public getName(): string | null {
        return this.name;
    }

    public getPasswordHash(): string {
        return this.passwordHash;
    }

    public getQualification(): string | null {
        return this.qualification;
    }

    public getRecoveryCodeHash(): string {
        return this.recoveryCodeHash;
    }

    public getTherapyMethod(): string | null {
        return this.therapyMethod;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public getYearsOfExperience(): number | null {
        return this.yearsOfExperience;
    }

    public isValidPassword(hash: string): boolean {
        return this.passwordHash === hash;
    }

    public setBiocode(value: number[]): void {
        this.biocode = value;
    }

    public setEmail(value: string): void {
        this.email = value;
    }

    public setEncryptedMasterKeyPrimary(value: string): void {
        this.encryptedMasterKeyPrimary = value;
    }

    public setEncryptedMasterKeyRecovery(value: string): void {
        this.encryptedMasterKeyRecovery = value;
    }

    public setLanguages(value: string[]): void {
        this.languages = value;
    }

    public setBiometricKeyAlias(value: string | null): void {
        this.biometricKeyAlias = value;
    }

    public setMasterKeyCheckHash(value: string): void {
        this.masterKeyCheckHash = value;
    }

    public setName(value: string | null): void {
        this.name = value;
    }

    public setPasswordHash(value: string): void {
        this.passwordHash = value;
    }

    public setQualification(value: string | null): void {
        this.qualification = value;
    }

    public setRecoveryCodeHash(value: string): void {
        this.recoveryCodeHash = value;
    }

    public setTherapyMethod(value: string | null): void {
        this.therapyMethod = value;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }

    public setYearsOfExperience(value: number | null): void {
        this.yearsOfExperience = value;
    }
}
