/**
 * Therapist entity: pure domain object (data + getters/setters).
 * Validates and decrypts; returns results. No infrastructure (Vault) in method signatures.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import type { CryptoEngine } from '../Security/CryptoEngine';
import type { RecoveryCode } from '../Security/RecoveryCode';

/** Input for creating a therapist; caller maps form/data to this shape. */
export interface CreateTherapistInput {
    email: string;
    password: string;
    languages: string[];
    qualifications: string[];
    experience: string;
    methods: string[];
}

export interface CreateTherapistResult {
    therapist: Therapist;
    artifacts: { recoveryCode: string; masterKey: string };
}

@Entity({ tableName: 'therapists' })
export class Therapist extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => uuidv4(), type: 'varchar', length: 36 })
    private uuid!: string;

    @Column({ default: '', type: 'varchar' })
    private email!: string;

    @Column({ default: null, type: 'varchar' })
    private name!: string | null;

    @Column({ default: '', type: 'text' })
    private passwordHash!: string;

    @Column({ default: null, type: 'varchar', length: 36 })
    private localKeyId!: string | null;

    @Column({ default: '', type: 'text' })
    private encryptedMasterKeyPrimary!: string;

    @Column({ default: '', type: 'text' })
    private encryptedMasterKeyRecovery!: string;

    @Column({ default: '', type: 'text' })
    private recoveryCodeHash!: string;

    @Column({ default: '', type: 'text' })
    private masterKeyCheckHash!: string;

    /** Language codes (stored as JSON string, transformed via 'json'). */
    @Column({ default: '[]', type: 'text', as: 'json' })
    private languages!: string[];

    /** Voice embedding vector, e.g. 512 floats from ecapa_tdnn (stored as JSON string, transformed via 'json'). */
    @Column({ default: '[]', type: 'text', as: 'json' })
    private biocodeEmbedding!: number[];

    @Column({ default: null, type: 'varchar' })
    private therapyMethod!: string | null;

    @Column({ default: null, type: 'varchar' })
    private qualification!: string | null;

    @Column({ default: null, type: 'integer' })
    private yearsOfExperience!: number | null;

    /** Custom repository; resolved lazily to avoid Therapist ↔ TherapistRepository require cycle. */
    static get repositoryClass() {
        return require('../Database/TherapistRepository').TherapistRepository;
    }

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

    public isValidPassword(passwordHash: string): boolean {
        return passwordHash === this.passwordHash;
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
     * Creates a therapist. Caller must persist and store masterKey in vault.
     */
    public static create(input: CreateTherapistInput, crypto: CryptoEngine, recovery: RecoveryCode): CreateTherapistResult {
        const uuid = uuidv4();
        const masterKey = crypto.randomKey(32);
        const recoveryCode = recovery.create();

        const saltPrimary = crypto.salt(uuid, 'vault_primary');
        const keyPrimaryHex = crypto.keyFromPassword(input.password, saltPrimary);
        const encryptedPrimary = crypto.encrypt(masterKey, keyPrimaryHex);

        const keyRecoveryHex = recovery.keyFromCode(recoveryCode, uuid);
        const encryptedRecovery = crypto.encrypt(masterKey, keyRecoveryHex);

        const passwordHash = crypto.hash(input.password);
        const recoveryCodeHash = crypto.hash(recoveryCode);
        const masterKeyCheckHash = crypto.hash(masterKey);

        const therapist = new Therapist({
            uuid,
            email: input.email,
            name: null,
            passwordHash,
            localKeyId: null,
            encryptedMasterKeyPrimary: encryptedPrimary,
            encryptedMasterKeyRecovery: encryptedRecovery,
            recoveryCodeHash,
            masterKeyCheckHash,
            languages: input.languages,
            biocodeEmbedding: [],
        });

        const qualifications = input.qualifications.length > 0 ? input.qualifications.join(',') : null;
        therapist.setQualification(qualifications);
        const years = parseInt(input.experience.trim(), 10);
        therapist.setYearsOfExperience(Number.isNaN(years) ? null : years);
        const methods = input.methods.length > 0 ? input.methods.join(',') : null;
        therapist.setTherapyMethod(methods);

        return { therapist, artifacts: { recoveryCode, masterKey } };
    }

    /**
     * Unlock with password: derive key, decrypt primary slot, verify integrity.
     * @returns masterKey if valid, null if password wrong or integrity check failed.
     */
    public unlock(password: string, crypto: CryptoEngine): string | null {
        const saltPrimary = crypto.salt(this.uuid, 'vault_primary');
        const keyPrimaryHex = crypto.keyFromPassword(password, saltPrimary);
        try {
            const masterKey = crypto.decrypt(this.encryptedMasterKeyPrimary, keyPrimaryHex);
            const computedHash = crypto.hash(masterKey);
            if (computedHash !== this.masterKeyCheckHash) {
                return null;
            }
            return masterKey;
        } catch (_error: unknown) {
            return null;
        }
    }

    /**
     * Recover with recovery code: decrypt master key, re-encrypt with new password, update entity fields.
     * Caller must persist the therapist and store masterKey in vault.
     * @returns masterKey for the caller to open the session.
     */
    public recover(recoveryCode: string, newPassword: string, crypto: CryptoEngine, recovery: RecoveryCode): string {
        const keyRecoveryHex = recovery.keyFromCode(recoveryCode, this.uuid);
        const masterKey = crypto.decrypt(this.encryptedMasterKeyRecovery, keyRecoveryHex);
        const saltPrimary = crypto.salt(this.uuid, 'vault_primary');
        const keyPrimaryHex = crypto.keyFromPassword(newPassword, saltPrimary);
        this.setPasswordHash(crypto.hash(newPassword));
        this.setEncryptedMasterKeyPrimary(crypto.encrypt(masterKey, keyPrimaryHex));
        return masterKey;
    }
}
