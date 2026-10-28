import { AppLogger } from '@/Core/AppLogger';
import { Container } from '@/Core/Container';
import { Database } from '@/Database/Database';
import { Encounter } from '@/Entity/Encounter';
import { Patient } from '@/Entity/Patient';
import { QueueItem } from '@/Entity/QueueItem';
import { EncounterStatus } from '@/Entity/Type';
import { EncounterFixture } from './Data/EncounterFixture';
import { FixtureException } from './FixtureException';

/**
 * FixtureLoader – Turns an encrypted audio file (.dat) into a ready-to-process
 * encounter fixture: persisted Encounter (ToProcess), Patient (empty biocode,
 * filled by the pipeline) and QueueItem (Waiting/Pending).
 *
 * DEV ONLY. Not for production use.
 */
export class FixtureLoader {
    public constructor(
        private readonly logger: AppLogger,
    ) {}

    public async load(therapistId: string, encryptedPath: string, durationMs: number): Promise<EncounterFixture> {
        this.validate(therapistId, encryptedPath, durationMs);

        const encounter = Encounter.create(therapistId, false);
        encounter.addEncryptedAudioPathWithDuration(encryptedPath, durationMs);
        encounter.setStatus(EncounterStatus.ToProcess);

        const patient = new Patient({ encounterId: encounter.getUuid() });
        const queueItem = QueueItem.createForEncounter(encounter.getUuid(), encryptedPath);

        const em = Database.getEntityManager();
        await em.getRepository(Encounter).persist(encounter);
        await em.upsert(patient);
        await em.getRepository(QueueItem).persist(queueItem);

        this.logger.info('FixtureLoader: encounter fixture loaded', {
            encounterUuid: encounter.getUuid(),
            patientUuid: patient.getUuid(),
            queueItemUuid: queueItem.getUuid(),
            durationMs,
        });

        return new EncounterFixture(encounter, patient, queueItem);
    }

    private validate(therapistId: string, encryptedPath: string, durationMs: number): void {
        if (typeof therapistId !== 'string') {
            throw new FixtureException(
                `Therapist id must be a string, got: ${typeof therapistId} (${String(therapistId)})`,
                'INVALID_THERAPIST_ID',
            );
        }

        if (therapistId.length === 0) {
            throw new FixtureException('Therapist id is required to load an encounter fixture', 'THERAPIST_ID_REQUIRED');
        }

        if (typeof encryptedPath !== 'string') {
            throw new FixtureException(
                `Encrypted audio path must be a string, got: ${typeof encryptedPath} (${String(encryptedPath)})`,
                'INVALID_ENCRYPTED_PATH',
            );
        }

        if (encryptedPath.length === 0) {
            throw new FixtureException('Encrypted audio path is required to load an encounter fixture', 'ENCRYPTED_PATH_REQUIRED');
        }

        if (!Number.isFinite(durationMs) || durationMs <= 0) {
            throw new FixtureException(`Invalid duration: ${durationMs}ms (expected a positive duration)`, 'INVALID_DURATION');
        }
    }
}

Container.register(
    FixtureLoader,
    () => new FixtureLoader(Container.get(AppLogger)),
);
