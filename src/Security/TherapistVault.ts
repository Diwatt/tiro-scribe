/**
 * Vault operations for Therapist: login, restore, recover, projection key, and account creation.
 * Keeps crypto and SecureStore out of the Therapist entity.
 */

import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import { Therapist } from '@/Entity/Therapist';
import { VaultKeyDerivation } from './VaultKeyDerivation';

export class TherapistVault {
    public static readonly SECURE_KEY_PREFIX = 'scribe_master_';

    /** Check password against stored hash (no vault unlock). */
    public static login(therapist: Therapist, password: string): boolean {
        const hash = CryptoJS.SHA256(password).toString();
        return hash === therapist.getPasswordHash();
    }

    /** Check if master key is present in SecureStore for this therapist. */
    public static async unlockLocalKey(therapist: Therapist): Promise<boolean> {
        const key = TherapistVault.SECURE_KEY_PREFIX + therapist.primaryKey;
        try {
            const value = await SecureStore.getItemAsync(key);
            return value != null && value.length > 0;
        } catch (_error: unknown) {
            return false;
        }
    }

    /** Decrypt master key from password, verify, store in SecureStore. */
    public static async restoreFromBackup(therapist: Therapist, password: string): Promise<boolean> {
        const salt = VaultKeyDerivation.buildSalt(therapist.primaryKey, 'vault_primary');
        const derived = VaultKeyDerivation.deriveKeyFromPassword(password, salt);
        try {
            const bytes = CryptoJS.AES.decrypt(therapist.getEncryptedMasterKeyPrimary(), derived);
            const masterKey = bytes.toString(CryptoJS.enc.Utf8);
            if (!masterKey) {
                return false;
            }
            const check = CryptoJS.SHA256(masterKey).toString();
            if (check !== therapist.getMasterKeyCheckHash()) {
                return false;
            }
            await SecureStore.setItemAsync(TherapistVault.SECURE_KEY_PREFIX + therapist.primaryKey, masterKey);
            return true;
        } catch (_error: unknown) {
            return false;
        }
    }

    /** Recover account with recovery code, set new password, re-encrypt and store master key. */
    public static async recoverAccount(therapist: Therapist, recoveryCode: string, newPassword: string): Promise<void> {
        const codeHash = CryptoJS.SHA256(recoveryCode).toString();
        if (codeHash !== therapist.getRecoveryCodeHash()) {
            throw new Error('Invalid recovery code');
        }
        const derived = VaultKeyDerivation.deriveKeyFromRecoveryCode(recoveryCode);
        const bytes = CryptoJS.AES.decrypt(therapist.getEncryptedMasterKeyRecovery(), derived);
        const masterKey = bytes.toString(CryptoJS.enc.Utf8);
        if (!masterKey) {
            throw new Error('Recovery decryption failed');
        }
        const check = CryptoJS.SHA256(masterKey).toString();
        if (check !== therapist.getMasterKeyCheckHash()) {
            throw new Error('Integrity check failed');
        }

        const newSalt = VaultKeyDerivation.buildSalt(therapist.primaryKey, 'vault_primary');
        const newDerived = VaultKeyDerivation.deriveKeyFromPassword(newPassword, newSalt);
        const newVaultA = CryptoJS.AES.encrypt(masterKey, newDerived).toString();
        const newPasswordHash = CryptoJS.SHA256(newPassword).toString();

        therapist.setEncryptedMasterKeyPrimary(newVaultA);
        therapist.setPasswordHash(newPasswordHash);
        await SecureStore.setItemAsync(TherapistVault.SECURE_KEY_PREFIX + therapist.primaryKey, masterKey);
    }

    /** Read master key from SecureStore (call after login/restore). */
    public static async getProjectionKey(therapist: Therapist): Promise<string> {
        const key = TherapistVault.SECURE_KEY_PREFIX + therapist.primaryKey;
        const value = await SecureStore.getItemAsync(key);
        if (value == null || value.length === 0) {
            throw new Error('Master key unavailable. Restore from backup or recover account.');
        }
        return value;
    }

    /**
     * Create account: master key, recovery code, encrypted slots. Optionally stores languages and initial voice vector.
     */
    public static async createAccount(
        email: string,
        password: string,
        name: string | null,
        languages: string[],
        initialBiocodeVector?: number[],
    ): Promise<{ therapist: Therapist; recoveryCode: string }> {
        const uuid = uuidv4();
        const masterKey = CryptoJS.lib.WordArray.random(32).toString();
        const recoveryCode = VaultKeyDerivation.generateRecoveryCode();

        const secureKey = TherapistVault.SECURE_KEY_PREFIX + uuid;
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
            languages,
            biocodeEmbedding: initialBiocodeVector ?? [],
        });
        return { therapist, recoveryCode };
    }
}
