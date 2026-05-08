import type { Kysely, Transaction } from 'kysely';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Container } from '@/Core/Container';
import { AppLogger } from '@/Core/AppLogger';
import { Repository } from '@/Database/Repository';
import type { DatabaseSchema } from '@/Database/Type';
import { Encounter } from '@/Entity/Encounter';
import { EncounterStatus } from '@/Entity/Type';
import { EncounterNotFound } from '@/Exception/EncounterNotFound';

dayjs.extend(utc);

export class EncounterRepository extends Repository<Encounter> {
    private readonly logger: AppLogger;

    public constructor(db?: Kysely<DatabaseSchema> | Transaction<DatabaseSchema>) {
        super(Encounter, Encounter.entityName, db);
        this.logger = Container.get(AppLogger);
    }

    /**
     * Transition an encounter to a new status, optionally updating duration.
     *
     * @throws {EncounterNotFound} If the encounter does not exist in storage.
     */
    public async updateStatus(encounter: Encounter, status: EncounterStatus, durationMs?: number): Promise<void> {
        const encounterUuid = encounter.getUuid();
        const exists = await this.exists(encounterUuid);

        if (!exists) {
            throw new EncounterNotFound(encounterUuid);
        }

        encounter.setStatus(status);
        if (durationMs !== undefined) {
            encounter.setTotalDuration(durationMs);
        }
        encounter.setUpdatedAt(dayjs.utc());
        await this.persist(encounter);

        this.logger.debug('📝 [EncounterRepository] Encounter status updated', {
            encounterUuid,
            status,
            durationMs,
        });
    }

    /**
     * Finalize an encounter after a recording segment:
     * attach the encrypted audio path, accumulate duration, and mark as ToProcess.
     *
     * @throws {EncounterNotFound} If the encounter does not exist in storage.
     */
    public async addRecording(encounter: Encounter, filePath: string, durationMs: number): Promise<void> {
        const encounterUuid = encounter.getUuid();
        const exists = await this.exists(encounterUuid);

        if (!exists) {
            throw new EncounterNotFound(encounterUuid);
        }

        encounter.setStatus(EncounterStatus.ToProcess);
        encounter.setUpdatedAt(dayjs.utc());
        encounter.addEncryptedAudioPathWithDuration(filePath, durationMs);
        await this.persist(encounter);

        this.logger.debug('📝 [EncounterRepository] Encounter updated with recording', {
            encounterUuid,
            status: EncounterStatus.ToProcess,
            totalDuration: encounter.getTotalDuration(),
            encryptedAudioPath: filePath,
        });
    }
}

Container.register(EncounterRepository, () => new EncounterRepository());
