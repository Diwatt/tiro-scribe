/**
 * TherapistRepository: Repository<Therapist> with session check and login orchestration.
 * Orchestrates persistence and vault (session key storage).
 * Vault is injected for testability; defaults to masterKeyVault when omitted.
 */

import type { Kysely, Transaction } from 'kysely';
import { Criteria } from '@/Database/Criteria';
import { Repository } from '@/Database/Repository';
import type { DatabaseSchema } from '@/Database/Type';
import { Therapist } from '@/Entity/Therapist';
import type { CryptoEngine } from '@/Security/CryptoEngine';
import { type MasterKeyVaultInterface, masterKeyVault } from '@/Security/MasterKeyVault';
import { TherapistForge } from '@/Security/TherapistForge';

export class TherapistRepository extends Repository<Therapist> {
    private readonly vault: MasterKeyVaultInterface;

    public constructor(vault: MasterKeyVaultInterface = masterKeyVault, db?: Kysely<DatabaseSchema> | Transaction<DatabaseSchema>) {
        super(Therapist, Therapist.entityName, db);
        this.vault = vault;
    }

    /**
     * Checks if the (single) therapist has an active session (master key in vault).
     */
    public async hasActiveSession(): Promise<boolean> {
        const therapist = await this.findOneBy(Criteria.of({}));
        if (!therapist) {
            return false;
        }
        return this.vault.exists(therapist.uuid);
    }

    /**
     * Attempts login: unlocks therapist, stores master key in vault if valid.
     * @returns true if login succeeded, false if no therapist or wrong password.
     */
    public async login(password: string, crypto: CryptoEngine): Promise<boolean> {
        const therapist = await this.findOneBy(Criteria.of({}));
        if (!therapist) {
            return false;
        }
        const masterKey = TherapistForge.unlock(therapist, password, crypto);
        if (masterKey == null) {
            return false;
        }
        await this.vault.save(therapist.uuid, masterKey);
        return true;
    }
}
