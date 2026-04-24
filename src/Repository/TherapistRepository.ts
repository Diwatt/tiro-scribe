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
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { RecoveryCode } from '@/Security/RecoveryCode';
import { TherapistForge } from '@/Security/TherapistForge';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';

export class TherapistRepository extends Repository<Therapist> {
    private readonly logger: AppLogger;
    private readonly vault: MasterKeyVault;

    public constructor(vault: MasterKeyVault, db?: Kysely<DatabaseSchema> | Transaction<DatabaseSchema>) {
        super(Therapist, Therapist.entityName, db);
        this.vault = vault;
        this.logger = Container.get(AppLogger);
    }

    /**
     * Finds the current/active therapist in the database.
     * In the current system design, there is only one therapist,
     * so this returns the first (and only) therapist.
     * 
     * @returns The therapist record, or undefined if no therapist exists
     * @throws {Error} If the database query fails
     */
    public async findCurrent(): Promise<Therapist | undefined> {
        try {
            const therapists = await this.findBy(Criteria.of({}));
            const therapist = therapists.first();
            
            this.logger.debug('▶️ [TherapistRepository] therapist query done', {
                found: therapist !== undefined,
                uuid: therapist?.getUuid() ?? null,
            });
            
            return therapist;
        } catch (error: unknown) {
            this.logger.error('❌ [TherapistRepository] therapist query threw', {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.constructor.name : 'unknown',
            });
            throw error;
        }
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
        // we only need crypto for unlock; recoveryCode is not used here
        const forge = new TherapistForge(crypto, new RecoveryCode());
        const masterKey = forge.unlock(therapist, password);
        if (masterKey == null) {
            return false;
        }
        await this.vault.save(therapist.uuid, masterKey);
        return true;
    }
}


Container.register(TherapistRepository, () => new TherapistRepository(Container.get(MasterKeyVault)));