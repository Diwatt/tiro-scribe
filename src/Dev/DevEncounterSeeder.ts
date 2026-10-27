import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Registry } from '@/Database/Registry';
import { Encounter } from '@/Entity/Encounter';
import { Patient } from '@/Entity/Patient';
import { QueueItem } from '@/Entity/QueueItem';
import { EncounterStatus } from '@/Entity/Type';
import type { EncounterRepository } from '@/Repository/EncounterRepository';
import type { QueueItemRepository } from '@/Repository/QueueItemRepository';
import { DevEncounterSeed } from './Data/DevEncounterSeed';
import { DevSeedException } from './DevSeedException';

/**
 * DevEncounterSeeder – Turns an encrypted dev audio file (.dat) into a
 * ready-to-process encounter: persisted Encounter (ToProcess), Patient (empty
 * biocode, filled by the pipeline) and QueueItem (Waiting/Pending).
 *
 * DEV ONLY. Not for production use.
 */
export class DevEncounterSeeder {
    public constructor(
        private readonly registry: Registry,
        private readonly logger: AppLogger,
    ) {}

    public async seed(therapistId: string, encryptedPath: string, durationMs: number): Promise<DevEncounterSeed> {
        this.validate(therapistId, encryptedPath, durationMs);

        const encounter = Encounter.create(therapistId, false);
        encounter.addEncryptedAudioPathWithDuration(encryptedPath, durationMs);
        encounter.setStatus(EncounterStatus.ToProcess);

        const patient = new Patient({ encounterId: encounter.getUuid() });
        const queueItem = QueueItem.createForEncounter(encounter.getUuid(), encryptedPath);

        await this.registry.getRepository<EncounterRepository>(Encounter).persist(encounter);
        await this.registry.getRepository(Patient).persist(patient);
        await this.registry.getRepository<QueueItemRepository>(QueueItem).persist(queueItem);

        this.logger.info('DevEncounterSeeder: encounter seeded', {
            encounterUuid: encounter.getUuid(),
            patientUuid: patient.getUuid(),
            queueItemUuid: queueItem.getUuid(),
            durationMs,
        });

        return new DevEncounterSeed(encounter, patient, queueItem);
    }

    private validate(therapistId: string, encryptedPath: string, durationMs: number): void {
        if (typeof therapistId !== 'string') {
            throw new DevSeedException(
                `Therapist id must be a string, got: ${typeof therapistId} (${String(therapistId)})`,
                'INVALID_THERAPIST_ID',
            );
        }

        if (therapistId.length === 0) {
            throw new DevSeedException('Therapist id is required to seed an encounter', 'THERAPIST_ID_REQUIRED');
        }

        if (typeof encryptedPath !== 'string') {
            throw new DevSeedException(
                `Encrypted audio path must be a string, got: ${typeof encryptedPath} (${String(encryptedPath)})`,
                'INVALID_ENCRYPTED_PATH',
            );
        }

        if (encryptedPath.length === 0) {
            throw new DevSeedException('Encrypted audio path is required to seed an encounter', 'ENCRYPTED_PATH_REQUIRED');
        }

        if (!Number.isFinite(durationMs) || durationMs <= 0) {
            throw new DevSeedException(`Invalid duration: ${durationMs}ms (expected a positive duration)`, 'INVALID_DURATION');
        }
    }
}

Container.register(
    DevEncounterSeeder,
    () => new DevEncounterSeeder(Container.get(Registry), Container.get(AppLogger)),
);
