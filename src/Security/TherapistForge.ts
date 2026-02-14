/**
 * TherapistForge: creates and unlocks Therapist entities (crypto + recovery).
 * Holds heavy cryptographic logic so Therapist stays a pure domain object.
 */

import { v4 as uuidv4 } from 'uuid';
import { Therapist } from '@/Entity/Therapist';
import type { CryptoEngine } from '@/Security/CryptoEngine';
import type { RecoveryCode } from '@/Security/RecoveryCode';

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

export class TherapistForge {
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

        const qualifications = input.qualifications.length > 0 ? input.qualifications.join(',') : null;
        const years = parseInt(input.experience.trim(), 10);
        const yearsOfExperience = Number.isNaN(years) ? null : years;
        const methods = input.methods.length > 0 ? input.methods.join(',') : null;

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
            qualification: qualifications,
            yearsOfExperience,
            therapyMethod: methods,
        });

        return { therapist, artifacts: { recoveryCode, masterKey } };
    }

    /**
     * Unlock with password: derive key, decrypt primary slot, verify integrity.
     * @returns masterKey if valid, null if password wrong or integrity check failed.
     */
    public static unlock(therapist: Therapist, password: string, crypto: CryptoEngine): string | null {
        const saltPrimary = crypto.salt(therapist.uuid, 'vault_primary');
        const keyPrimaryHex = crypto.keyFromPassword(password, saltPrimary);
        try {
            const masterKey = crypto.decrypt(therapist.encryptedMasterKeyPrimary, keyPrimaryHex);
            const computedHash = crypto.hash(masterKey);
            if (computedHash !== therapist.masterKeyCheckHash) {
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
    public static recover(therapist: Therapist, recoveryCode: string, newPassword: string, crypto: CryptoEngine, recovery: RecoveryCode): string {
        const keyRecoveryHex = recovery.keyFromCode(recoveryCode, therapist.uuid);
        const masterKey = crypto.decrypt(therapist.encryptedMasterKeyRecovery, keyRecoveryHex);
        const saltPrimary = crypto.salt(therapist.uuid, 'vault_primary');
        const keyPrimaryHex = crypto.keyFromPassword(newPassword, saltPrimary);
        therapist.passwordHash = crypto.hash(newPassword);
        therapist.encryptedMasterKeyPrimary = crypto.encrypt(masterKey, keyPrimaryHex);

        return masterKey;
    }
}
