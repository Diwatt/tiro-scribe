import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Database } from '@/Database/Database';
import { Encounter } from '@/Entity/Encounter';
import { EncounterStatus } from '@/Entity/Type';
import { EncounterNotFound } from '@/Exception/EncounterNotFound';
import { AbstractRepository } from './AbstractRepository';

dayjs.extend(utc);

export class EncounterRepository extends AbstractRepository<Encounter> {
    private get logger(): AppLogger {
        return Container.get(AppLogger);
    }

    /**
     * Transition an encounter to a new status, optionally updating duration.
     *
     * @throws {EncounterNotFound} If the encounter does not exist in storage.
     */
    public async updateStatus(encounter: Encounter, status: EncounterStatus, durationMs?: number): Promise<void> {
        await this.ensureExists(encounter);
        encounter.setStatus(status);
        if (durationMs !== undefined) {
            encounter.setTotalDuration(durationMs);
        }
        encounter.setUpdatedAt(dayjs.utc());
        await this.persist(encounter);

        this.logger.debug('[EncounterRepository] Encounter status updated', {
            encounterUuid: encounter.getUuid(),
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
        await this.ensureExists(encounter);
        encounter.setStatus(EncounterStatus.ToProcess);
        encounter.setUpdatedAt(dayjs.utc());
        encounter.addEncryptedAudioPathWithDuration(filePath, durationMs);
        await this.persist(encounter);

        this.logger.debug('[EncounterRepository] Encounter updated with recording', {
            encounterUuid: encounter.getUuid(),
            status: EncounterStatus.ToProcess,
            totalDuration: encounter.getTotalDuration(),
            encryptedAudioPath: filePath,
        });
    }

    private async ensureExists(encounter: Encounter): Promise<void> {
        if (!(await this.exists(encounter.getUuid()))) {
            throw new EncounterNotFound(encounter.getUuid());
        }
    }
}

Container.register(EncounterRepository, () => Database.getEntityManager().getRepository(Encounter));
