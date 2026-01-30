/**
 * Therapist entity: property declarations with visibility; @Column on the property. Security logic (key wrapping) intact.
 */

import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Decorator';
import { VaultKeyDerivation } from './VaultKeyDerivation';

const SECURE_KEY_PREFIX = 'scribe_master_';

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

    /** JSON array of language codes, e.g. ["fr"], ["en"], ["fr","en"]. */
    @Column({ default: '[]' })
    private languages!: string;

    /** JSON array: voice embedding vector (e.g. 512 floats from ecapa_tdnn). */
    @Column({ default: '[]' })
    private biocodeEmbedding!: string;

    @Column({ default: null })
    private therapyMethod!: string | null;

    @Column({ default: null })
    private qualification!: string | null;

    @Column({ default: null })
    private yearsOfExperience!: number | null;

    public getUuid(): string {
        return this.getField<string>('uuid') as string;
    }

    public setUuid(value: string): void {
        this.setField('uuid', value);
    }

    public getEmail(): string {
        return this.getField<string>('email') as string;
    }

    public setEmail(value: string): void {
        this.setField('email', value);
    }

    public getName(): string | null {
        return this.getField<string | null>('name') as string | null;
    }

    public setName(value: string | null): void {
        this.setField('name', value);
    }

    public getPasswordHash(): string {
        return this.getField<string>('passwordHash') as string;
    }

    public setPasswordHash(value: string): void {
        this.setField('passwordHash', value);
    }

    public getLocalKeyId(): string | null {
        return this.getField<string | null>('localKeyId') as string | null;
    }

    public setLocalKeyId(value: string | null): void {
        this.setField('localKeyId', value);
    }

    public getEncryptedMasterKeyPrimary(): string {
        return this.getField<string>('encryptedMasterKeyPrimary') as string;
    }

    public setEncryptedMasterKeyPrimary(value: string): void {
        this.setField('encryptedMasterKeyPrimary', value);
    }

    public getEncryptedMasterKeyRecovery(): string {
        return this.getField<string>('encryptedMasterKeyRecovery') as string;
    }

    public setEncryptedMasterKeyRecovery(value: string): void {
        this.setField('encryptedMasterKeyRecovery', value);
    }

    public getRecoveryCodeHash(): string {
        return this.getField<string>('recoveryCodeHash') as string;
    }

    public setRecoveryCodeHash(value: string): void {
        this.setField('recoveryCodeHash', value);
    }

    public getMasterKeyCheckHash(): string {
        return this.getField<string>('masterKeyCheckHash') as string;
    }

    public setMasterKeyCheckHash(value: string): void {
        this.setField('masterKeyCheckHash', value);
    }

    public getLanguages(): string {
        return this.getField<string>('languages') as string;
    }

    public setLanguages(value: string): void {
        this.setField('languages', value);
    }

    public getBiocodeEmbedding(): string {
        return this.getField<string>('biocodeEmbedding') as string;
    }

    public setBiocodeEmbedding(value: string): void {
        this.setField('biocodeEmbedding', value);
    }

    public getTherapyMethod(): string | null {
        return this.getField<string | null>('therapyMethod') as string | null;
    }

    public setTherapyMethod(value: string | null): void {
        this.setField('therapyMethod', value);
    }

    public getQualification(): string | null {
        return this.getField<string | null>('qualification') as string | null;
    }

    public setQualification(value: string | null): void {
        this.setField('qualification', value);
    }

    public getYearsOfExperience(): number | null {
        return this.getField<number | null>('yearsOfExperience') as number | null;
    }

    public setYearsOfExperience(value: number | null): void {
        this.setField('yearsOfExperience', value);
    }

    async login(password: string): Promise<boolean> {
        const hash = CryptoJS.SHA256(password).toString();
        return hash === this.passwordHash;
    }

    async unlockLocalKey(): Promise<boolean> {
        const key = SECURE_KEY_PREFIX + this.primaryKey;
        try {
            const value = await SecureStore.getItemAsync(key);
            return value != null && value.length > 0;
        } catch {
            return false;
        }
    }

    async restoreFromBackup(password: string): Promise<boolean> {
        const salt = VaultKeyDerivation.buildSalt(this.primaryKey, 'vault_primary');
        const derived = VaultKeyDerivation.deriveKeyFromPassword(password, salt);
        try {
            const bytes = CryptoJS.AES.decrypt(this.encryptedMasterKeyPrimary, derived);
            const masterKey = bytes.toString(CryptoJS.enc.Utf8);
            if (!masterKey) return false;
            const check = CryptoJS.SHA256(masterKey).toString();
            if (check !== this.masterKeyCheckHash) return false;
            await SecureStore.setItemAsync(SECURE_KEY_PREFIX + this.primaryKey, masterKey);
            return true;
        } catch {
            return false;
        }
    }

    async recoverAccount(recoveryCode: string, newPassword: string): Promise<void> {
        const codeHash = CryptoJS.SHA256(recoveryCode).toString();
        if (codeHash !== this.recoveryCodeHash) throw new Error('Invalid recovery code');
        const derived = VaultKeyDerivation.deriveKeyFromRecoveryCode(recoveryCode);
        const bytes = CryptoJS.AES.decrypt(this.encryptedMasterKeyRecovery, derived);
        const masterKey = bytes.toString(CryptoJS.enc.Utf8);
        if (!masterKey) throw new Error('Recovery decryption failed');
        const check = CryptoJS.SHA256(masterKey).toString();
        if (check !== this.masterKeyCheckHash) throw new Error('Integrity check failed');

        const newSalt = VaultKeyDerivation.buildSalt(this.primaryKey, 'vault_primary');
        const newDerived = VaultKeyDerivation.deriveKeyFromPassword(newPassword, newSalt);
        const newVaultA = CryptoJS.AES.encrypt(masterKey, newDerived).toString();
        const newPasswordHash = CryptoJS.SHA256(newPassword).toString();

        this.encryptedMasterKeyPrimary = newVaultA;
        this.passwordHash = newPasswordHash;
        await SecureStore.setItemAsync(SECURE_KEY_PREFIX + this.primaryKey, masterKey);
    }

    async getProjectionKey(): Promise<string> {
        const key = SECURE_KEY_PREFIX + this.primaryKey;
        const value = await SecureStore.getItemAsync(key);
        if (value == null || value.length === 0) {
            throw new Error('Master key unavailable. Restore from backup or recover account.');
        }
        return value;
    }

    /**
     * Creates account: master key, recovery code, encrypted slots. Optionally stores languages and initial voice vector.
     */
    static async initializeAccount(
        email: string,
        password: string,
        name: string | null,
        languages: string[],
        initialBiocodeVector?: number[],
    ): Promise<{ therapist: Therapist; recoveryCode: string }> {
        const uuid = uuidv4();
        const masterKey = CryptoJS.lib.WordArray.random(32).toString();
        const recoveryCode = VaultKeyDerivation.generateRecoveryCode();

        const secureKey = SECURE_KEY_PREFIX + uuid;
        await SecureStore.setItemAsync(secureKey, masterKey);

        const saltPrimary = VaultKeyDerivation.buildSalt(uuid, 'vault_primary');
        const keyPrimary = VaultKeyDerivation.deriveKeyFromPassword(password, saltPrimary);
        const encryptedPrimary = CryptoJS.AES.encrypt(masterKey, keyPrimary).toString();

        const keyRecovery = VaultKeyDerivation.deriveKeyFromRecoveryCode(recoveryCode);
        const encryptedRecovery = CryptoJS.AES.encrypt(masterKey, keyRecovery).toString();

        const passwordHash = CryptoJS.SHA256(password).toString();
        const recoveryCodeHash = CryptoJS.SHA256(recoveryCode).toString();
        const masterKeyCheckHash = CryptoJS.SHA256(masterKey).toString();

        const therapist = new Therapist({
            uuid,
            email,
            name,
            passwordHash,
            localKeyId: secureKey,
            encryptedMasterKeyPrimary: encryptedPrimary,
            encryptedMasterKeyRecovery: encryptedRecovery,
            recoveryCodeHash,
            masterKeyCheckHash,
            languages: JSON.stringify(languages),
            biocodeEmbedding: initialBiocodeVector ? JSON.stringify(initialBiocodeVector) : '[]',
        });

        return { therapist, recoveryCode };
    }
}
