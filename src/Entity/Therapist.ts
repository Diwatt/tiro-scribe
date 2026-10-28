/**
 * Therapist entity: pure domain object (schema + data).
 * Creation, unlock and recovery are in TherapistForge.
 */

import { defineEntity, p } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { TherapistRepository } from '@/Repository/TherapistRepository';

const TherapistSchema = defineEntity({
    name: 'Therapist',
    tableName: 'therapists',
    repository: () => TherapistRepository,
    properties: {
        biocode: p.json<number[]>().onCreate(() => []),
        email: p.string().default(''),
        encryptedMasterKeyPrimary: p.text().default(''),
        encryptedMasterKeyRecovery: p.text().default(''),
        languages: p.json<string[]>().onCreate(() => []),
        // TODO (Post-MVP) : Here we gonnna store the alias for the hardware key (Keystore/Secure Enclave).
        // It will be use to encrypt and decrypt the Master Key with biometrics interface (FaceID/TouchID)
        // to avoid the therapist to retype his password on every app opening
        biometricKeyAlias: p.string().length(36).nullable(),
        masterKeyCheckHash: p.text().default(''),
        name: p.string().nullable(),
        passwordHash: p.text().default(''),
        qualification: p.string().nullable(),
        recoveryCodeHash: p.text().default(''),
        therapyMethod: p.string().nullable(),
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        yearsOfExperience: p.integer().nullable(),
    },
});

export class Therapist extends TherapistSchema.class {
    public constructor(data: Partial<Therapist> = {}) {
        super();
        this.uuid = data.uuid ?? uuidv4();
        this.biocode = data.biocode ?? [];
        this.email = data.email ?? '';
        this.encryptedMasterKeyPrimary = data.encryptedMasterKeyPrimary ?? '';
        this.encryptedMasterKeyRecovery = data.encryptedMasterKeyRecovery ?? '';
        this.languages = data.languages ?? [];
        this.biometricKeyAlias = data.biometricKeyAlias ?? null;
        this.masterKeyCheckHash = data.masterKeyCheckHash ?? '';
        this.name = data.name ?? null;
        this.passwordHash = data.passwordHash ?? '';
        this.qualification = data.qualification ?? null;
        this.recoveryCodeHash = data.recoveryCodeHash ?? '';
        this.therapyMethod = data.therapyMethod ?? null;
        this.yearsOfExperience = data.yearsOfExperience ?? null;
    }

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
        return this.biometricKeyAlias ?? null;
    }

    public getMasterKeyCheckHash(): string {
        return this.masterKeyCheckHash;
    }

    public getName(): string | null {
        return this.name ?? null;
    }

    public getPasswordHash(): string {
        return this.passwordHash;
    }

    public getQualification(): string | null {
        return this.qualification ?? null;
    }

    public getRecoveryCodeHash(): string {
        return this.recoveryCodeHash;
    }

    public getTherapyMethod(): string | null {
        return this.therapyMethod ?? null;
    }

    public getUuid(): string {
        return this.uuid;
    }

    public getYearsOfExperience(): number | null {
        return this.yearsOfExperience ?? null;
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

TherapistSchema.setClass(Therapist);
