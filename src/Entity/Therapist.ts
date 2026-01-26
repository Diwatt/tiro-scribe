/**
 * Therapist entity: property declarations with visibility; @Column on the property. Security logic (key wrapping) intact.
 */

import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { AbstractEntity } from '../Database/AbstractEntity';
import { Column, Entity, PrimaryKey } from '../Database/Decorators';

const SECURE_KEY_PREFIX = 'scribe_master_';
const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEYSIZE = 256 / 32;
const RECOVERY_SALT = 'scribe_recovery_v1';
const RECOVERY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERY_PART_LEN = 4;

function buildSalt(uuid: string, tag: string): string {
    return `scribe_${tag}_${uuid}`;
}

function deriveKeyFromPassword(password: string, salt: string): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(password, salt, {
        keySize: PBKDF2_KEYSIZE,
        iterations: PBKDF2_ITERATIONS,
    });
}

function deriveKeyFromRecoveryCode(recoveryCode: string): CryptoJS.lib.WordArray {
    return CryptoJS.PBKDF2(recoveryCode, RECOVERY_SALT, {
        keySize: PBKDF2_KEYSIZE,
        iterations: PBKDF2_ITERATIONS,
    });
}

function generateRecoveryCode(): string {
    const part = (): string => {
        let s = '';
        for (let i = 0; i < RECOVERY_PART_LEN; i++) {
            s += RECOVERY_CHARS.charAt(Math.floor(Math.random() * RECOVERY_CHARS.length));
        }
        return s;
    };
    return [part(), part(), part()].join('-');
}

@Entity({ table_name: 'therapists' })
export class Therapist extends AbstractEntity {
    @PrimaryKey()
    @Column({ default: () => crypto.randomUUID() })
    public uuid!: string;

    @Column({ default: '' })
    public email!: string;

    @Column({ default: null })
    public name!: string | null;

    @Column({ default: '' })
    public passwordHash!: string;

    @Column({ default: null })
    public localKeyId!: string | null;

    @Column({ default: '' })
    public encryptedMasterKey_Primary!: string;

    @Column({ default: '' })
    public encryptedMasterKey_Recovery!: string;

    @Column({ default: '' })
    public recoveryCodeHash!: string;

    @Column({ default: '' })
    public masterKeyCheckHash!: string;

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
        const salt = buildSalt(this.primaryKey, 'vault_primary');
        const derived = deriveKeyFromPassword(password, salt);
        try {
            const bytes = CryptoJS.AES.decrypt(this.encryptedMasterKey_Primary, derived);
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
        const derived = deriveKeyFromRecoveryCode(recoveryCode);
        const bytes = CryptoJS.AES.decrypt(this.encryptedMasterKey_Recovery, derived);
        const masterKey = bytes.toString(CryptoJS.enc.Utf8);
        if (!masterKey) throw new Error('Recovery decryption failed');
        const check = CryptoJS.SHA256(masterKey).toString();
        if (check !== this.masterKeyCheckHash) throw new Error('Integrity check failed');

        const newSalt = buildSalt(this.primaryKey, 'vault_primary');
        const newDerived = deriveKeyFromPassword(newPassword, newSalt);
        const newVaultA = CryptoJS.AES.encrypt(masterKey, newDerived).toString();
        const newPasswordHash = CryptoJS.SHA256(newPassword).toString();

        this.encryptedMasterKey_Primary = newVaultA;
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

    static async initializeAccount(
        email: string,
        password: string,
        name: string | null,
    ): Promise<{ therapist: Therapist; recoveryCode: string }> {
        const uuid = crypto.randomUUID();
        const masterKey = CryptoJS.lib.WordArray.random(32).toString();
        const recoveryCode = generateRecoveryCode();

        const secureKey = SECURE_KEY_PREFIX + uuid;
        await SecureStore.setItemAsync(secureKey, masterKey);

        const saltPrimary = buildSalt(uuid, 'vault_primary');
        const keyPrimary = deriveKeyFromPassword(password, saltPrimary);
        const encryptedPrimary = CryptoJS.AES.encrypt(masterKey, keyPrimary).toString();

        const keyRecovery = deriveKeyFromRecoveryCode(recoveryCode);
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
            encryptedMasterKey_Primary: encryptedPrimary,
            encryptedMasterKey_Recovery: encryptedRecovery,
            recoveryCodeHash,
            masterKeyCheckHash,
        });

        return { therapist, recoveryCode };
    }
}
