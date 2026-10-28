/**
 * TherapistRepository: session check and login orchestration over MasterKeyVault.
 * Dependencies are resolved lazily from the Container (the ORM instantiates repositories itself).
 */

import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Database } from '@/Database/Database';
import { Therapist } from '@/Entity/Therapist';
import type { CryptoEngine } from '@/Security/CryptoEngine';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { RecoveryCode } from '@/Security/RecoveryCode';
import { TherapistForge } from '@/Security/TherapistForge';
import { AbstractRepository } from './AbstractRepository';

export class TherapistRepository extends AbstractRepository<Therapist> {
    private get logger(): AppLogger {
        return Container.get(AppLogger);
    }

    private get vault(): MasterKeyVault {
        return Container.get(MasterKeyVault);
    }

    /** The single therapist record, or undefined when none exists. */
    public async findCurrent(): Promise<Therapist | undefined> {
        const therapist = await this.findSingle();
        this.logger.debug('[TherapistRepository] therapist query done', {
            found: therapist != null,
            uuid: therapist?.getUuid() ?? null,
        });

        return therapist ?? undefined;
    }

    /** True when the (single) therapist exists and its master key is in the vault. */
    public async hasActiveSession(): Promise<boolean> {
        const therapist = await this.findSingle();
        if (therapist == null) {
            return false;
        }

        return this.vault.exists(therapist.uuid);
    }

    /** Attempts login: unlocks therapist, stores master key in vault if valid. */
    public async login(password: string, crypto: CryptoEngine): Promise<boolean> {
        const therapist = await this.findSingle();
        if (therapist == null) {
            return false;
        }

        const forge = new TherapistForge(crypto, new RecoveryCode());
        const masterKey = forge.unlock(therapist, password);
        if (masterKey == null) {
            return false;
        }

        await this.vault.save(therapist.uuid, masterKey);
        return true;
    }

    private async findSingle(): Promise<Therapist | null> {
        // v7: findAll takes a single options object; findOne rejects an empty where
        const [therapist] = await this.findAll({ where: {}, limit: 1 });
        return therapist ?? null;
    }
}

Container.register(TherapistRepository, () => Database.getEntityManager().getRepository(Therapist));
