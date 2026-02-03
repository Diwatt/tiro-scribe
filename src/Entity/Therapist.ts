/**
 * Therapist entity: property declarations with visibility; @Column on the property.
 * Vault operations (login, restore, recover, projection key, initialize) live in TherapistVault.
 * Session check delegates to TherapistRepository (therapist has unlocked key in SecureStore).
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { registry } from '../Database/Registry';
import { Column, Entity, PrimaryKey } from '../Decorator';

@Entity({ table_name: 'therapists' })
export class Therapist extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4() })
    private uuid!: string;

    @Column({ default: '' })
    private email!: string;

    @Column({ default: null })
    private name!: string | null;

    @Column({ default: '' })
    private passwordHash!: string;

    @Column({ default: null })
    private localKeyId!: string | null;

    @Column({ default: '' })
    private encryptedMasterKeyPrimary!: string;

    @Column({ default: '' })
    private encryptedMasterKeyRecovery!: string;

    @Column({ default: '' })
    private recoveryCodeHash!: string;

    @Column({ default: '' })
    private masterKeyCheckHash!: string;

    /** Language codes (stored as JSON string, transformed via 'json'). */
    @Column({ default: '[]', as: 'json' })
    private languages!: string[];

    /** Voice embedding vector, e.g. 512 floats from ecapa_tdnn (stored as JSON string, transformed via 'json'). */
    @Column({ default: '[]', as: 'json' })
    private biocodeEmbedding!: number[];

    @Column({ default: null })
    private therapyMethod!: string | null;

    @Column({ default: null })
    private qualification!: string | null;

    @Column({ default: null })
    private yearsOfExperience!: number | null;

    public getUuid(): string {
        return this.uuid;
    }

    public setUuid(value: string): void {
        this.uuid = value;
    }

    public getEmail(): string {
        return this.email;
    }

    public setEmail(value: string): void {
        this.email = value;
    }

    public getName(): string | null {
        return this.name;
    }

    public setName(value: string | null): void {
        this.name = value;
    }

    public getPasswordHash(): string {
        return this.passwordHash;
    }

    public setPasswordHash(value: string): void {
        this.passwordHash = value;
    }

    public getLocalKeyId(): string | null {
        return this.localKeyId;
    }

    public setLocalKeyId(value: string | null): void {
        this.localKeyId = value;
    }

    public getEncryptedMasterKeyPrimary(): string {
        return this.encryptedMasterKeyPrimary;
    }

    public setEncryptedMasterKeyPrimary(value: string): void {
        this.encryptedMasterKeyPrimary = value;
    }

    public getEncryptedMasterKeyRecovery(): string {
        return this.encryptedMasterKeyRecovery;
    }

    public setEncryptedMasterKeyRecovery(value: string): void {
        this.encryptedMasterKeyRecovery = value;
    }

    public getRecoveryCodeHash(): string {
        return this.recoveryCodeHash;
    }

    public setRecoveryCodeHash(value: string): void {
        this.recoveryCodeHash = value;
    }

    public getMasterKeyCheckHash(): string {
        return this.masterKeyCheckHash;
    }

    public setMasterKeyCheckHash(value: string): void {
        this.masterKeyCheckHash = value;
    }

    public getLanguages(): string[] {
        return this.languages;
    }

    public setLanguages(value: string[]): void {
        this.languages = value;
    }

    public getBiocodeEmbedding(): number[] {
        return this.biocodeEmbedding;
    }

    public setBiocodeEmbedding(value: number[]): void {
        this.biocodeEmbedding = value;
    }

    public getTherapyMethod(): string | null {
        return this.therapyMethod;
    }

    public setTherapyMethod(value: string | null): void {
        this.therapyMethod = value;
    }

    public getQualification(): string | null {
        return this.qualification;
    }

    public setQualification(value: string | null): void {
        this.qualification = value;
    }

    public getYearsOfExperience(): number | null {
        return this.yearsOfExperience;
    }

    public setYearsOfExperience(value: number | null): void {
        this.yearsOfExperience = value;
    }

    /**
     * Checks if a therapist is currently logged in.
     * Logic: MMKV has 'current_therapist_id' OR repository has a therapist with unlocked key (SecureStore).
     * Delegates to TherapistRepository.
     */
    static async hasActiveSession(): Promise<boolean> {
        return registry.getRepository(Therapist).hasActiveSession();
    }
}
