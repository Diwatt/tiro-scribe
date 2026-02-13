/**
 * TherapistRepository: Repository<Therapist> with session check and login orchestration.
 * Orchestrates persistence and vault (session key storage).
 * Vault is injected for testability; defaults to masterKeyVault when omitted.
 */

import { Therapist } from '@/Entity/Therapist';
import type { CryptoEngine } from '@/Security/CryptoEngine';
import { masterKeyVault, type MasterKeyVaultInterface } from '@/Security/MasterKeyVault';
import { Repository } from './Repository';

export class TherapistRepository extends Repository<Therapist> {
    private readonly vault: MasterKeyVaultInterface;

    public constructor(vault: MasterKeyVaultInterface = masterKeyVault) {
        super(Therapist, Therapist.entityName);
        this.vault = vault;
    }

    /**
     * Checks if the (single) therapist has an active session (master key in vault).
     */
    public async hasActiveSession(): Promise<boolean> {
        const therapist = await this.findOneBy({});
        if (!therapist) {
            return false;
        }
        return this.vault.exists(therapist.getUuid());
    }

    /**
     * Attempts login: unlocks therapist, stores master key in vault if valid.
     * @returns true if login succeeded, false if no therapist or wrong password.
     */
    public async login(password: string, crypto: CryptoEngine): Promise<boolean> {
        const therapist = await this.findOneBy({});
        if (!therapist) {
            return false;
        }
        const masterKey = therapist.unlock(password, crypto);
        if (masterKey == null) {
            return false;
        }
        await this.vault.save(therapist.getUuid(), masterKey);
        return true;
    }
}
