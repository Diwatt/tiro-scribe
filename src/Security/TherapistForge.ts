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
    public constructor(
        private readonly crypto: CryptoEngine,
        private readonly recovery: RecoveryCode,
    ) {}

    /**
     * Creates a therapist. Caller must persist and store masterKey in vault.
     */
    public create(input: CreateTherapistInput): CreateTherapistResult {
        const uuid = uuidv4();
        const masterKey = this.crypto.randomKey(32);
        const recoveryCode = this.recovery.create();

        const saltPrimary = this.crypto.salt(uuid, 'vault_primary');
        const keyPrimaryHex = this.crypto.keyFromPassword(input.password, saltPrimary);
        const encryptedPrimary = this.crypto.encrypt(masterKey, keyPrimaryHex);

        const keyRecoveryHex = this.recovery.keyFromCode(recoveryCode, uuid);
        const encryptedRecovery = this.crypto.encrypt(masterKey, keyRecoveryHex);

        const passwordHash = this.crypto.hash(input.password);
        const recoveryCodeHash = this.crypto.hash(recoveryCode);
        const masterKeyCheckHash = this.crypto.hash(masterKey);

        const qualifications = input.qualifications.length > 0 ? input.qualifications.join(',') : null;
        const years = Number.parseInt(input.experience.trim(), 10);
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
            biocode: [],
            qualification: qualifications,
            yearsOfExperience,
            therapyMethod: methods,
        });

        return { therapist, artifacts: { recoveryCode, masterKey } };
    }

    /**
     * Recover with recovery code: decrypt master key, re-encrypt with new password, update entity fields.
     * Caller must persist the therapist and store masterKey in vault.
     * @returns masterKey for the caller to open the session.
     */
    public recover(therapist: Therapist, recoveryCode: string, newPassword: string): string {
        const keyRecoveryHex = this.recovery.keyFromCode(recoveryCode, therapist.uuid);
        const masterKey = this.crypto.decrypt(therapist.encryptedMasterKeyRecovery, keyRecoveryHex);
        const saltPrimary = this.crypto.salt(therapist.uuid, 'vault_primary');
        const keyPrimaryHex = this.crypto.keyFromPassword(newPassword, saltPrimary);
        therapist.passwordHash = this.crypto.hash(newPassword);
        therapist.encryptedMasterKeyPrimary = this.crypto.encrypt(masterKey, keyPrimaryHex);

        return masterKey;
    }

    /**
     * Unlock with password: derive key, decrypt primary slot, verify integrity.
     * @returns masterKey if valid, null if password wrong or integrity check failed.
     */
    public unlock(therapist: Therapist, password: string): string | null {
        const saltPrimary = this.crypto.salt(therapist.uuid, 'vault_primary');
        const keyPrimaryHex = this.crypto.keyFromPassword(password, saltPrimary);

        const masterKey = this.crypto.decrypt(therapist.encryptedMasterKeyPrimary, keyPrimaryHex);
        const computedHash = this.crypto.hash(masterKey);
        if (computedHash !== therapist.masterKeyCheckHash) {
            return null;
        }

        return masterKey;
    }
}
