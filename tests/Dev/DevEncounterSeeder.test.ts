const mockLoggerFns = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
};

const mockEncounterRepo = {
    persist: jest.fn(),
};

const mockPatientRepo = {
    persist: jest.fn(),
};

const mockQueueItemRepo = {
    persist: jest.fn(),
};

jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

// Real entities need Stage 3 decorator metadata that Jest cannot load — see tests/Entity.
jest.mock('@/Entity/Encounter', () => ({ Encounter: require('../helpers/fakeDevEntities').FakeEncounter }));
jest.mock('@/Entity/Patient', () => ({ Patient: require('../helpers/fakeDevEntities').FakePatient }));
jest.mock('@/Entity/QueueItem', () => ({ QueueItem: require('../helpers/fakeDevEntities').FakeQueueItem }));

import { DevEncounterSeeder } from '@/Dev/DevEncounterSeeder';
import { DevSeedException } from '@/Dev/DevSeedException';
import { EncounterStatus, PipelineStage, QueueItemStatus } from '@/Entity/Type';
import { FakeEncounter, FakePatient } from '../helpers/fakeDevEntities';

const THERAPIST_ID = 'therapist-uuid-1';
const ENCRYPTED_PATH = '/documents/seed_abc123.dat';

const createSeeder = (): DevEncounterSeeder => {
    const registry = {
        getRepository: jest.fn((EntityClass: unknown) => {
            if (EntityClass === FakeEncounter) {
                return mockEncounterRepo;
            }
            if (EntityClass === FakePatient) {
                return mockPatientRepo;
            }
            return mockQueueItemRepo;
        }),
    };

    return new DevEncounterSeeder(registry as never, mockLoggerFns as never);
};

describe('DevEncounterSeeder', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('seed', () => {
        it('persists the encounter as ToProcess carrying the encrypted path and duration', async () => {
            const seeder = createSeeder();
            const seed = await seeder.seed(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(seed.encounter.getStatus()).toBe(EncounterStatus.ToProcess);
            expect(seed.encounter.getTherapistId()).toBe(THERAPIST_ID);
            expect(seed.encounter.getEncryptedAudioPaths()).toEqual([ENCRYPTED_PATH]);
            expect(seed.encounter.getTotalDuration()).toBe(65_000);
            expect(mockEncounterRepo.persist).toHaveBeenCalledTimes(1);
            expect(mockEncounterRepo.persist).toHaveBeenCalledWith(seed.encounter);
        });

        it('persists a patient attached to the encounter with an empty biocode', async () => {
            const seeder = createSeeder();
            const seed = await seeder.seed(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(seed.patient.getEncounterId()).toBe(seed.encounter.getUuid());
            expect(seed.patient.getBiocode()).toBe('');
            expect(mockPatientRepo.persist).toHaveBeenCalledTimes(1);
            expect(mockPatientRepo.persist).toHaveBeenCalledWith(seed.patient);
        });

        it('persists a queue item in Waiting/Pending carrying the encounter and the encrypted path', async () => {
            const seeder = createSeeder();
            const seed = await seeder.seed(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(seed.queueItem.getEncounterId()).toBe(seed.encounter.getUuid());
            expect(seed.queueItem.getEncryptedAudioPath()).toBe(ENCRYPTED_PATH);
            expect(seed.queueItem.getPipelineStage()).toBe(PipelineStage.Waiting);
            expect(seed.queueItem.getStatus()).toBe(QueueItemStatus.Pending);
            expect(mockQueueItemRepo.persist).toHaveBeenCalledTimes(1);
            expect(mockQueueItemRepo.persist).toHaveBeenCalledWith(seed.queueItem);
        });

        it('returns a summary carrying the three entity uuids', async () => {
            const seeder = createSeeder();
            const seed = await seeder.seed(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(seed.summary).toContain(seed.encounter.getUuid());
            expect(seed.summary).toContain(seed.patient.getUuid());
            expect(seed.summary).toContain(seed.queueItem.getUuid());
        });

        it('does not persist anything when the encounter persistence fails', async () => {
            mockEncounterRepo.persist.mockRejectedValueOnce(new Error('db is locked'));
            const seeder = createSeeder();

            await expect(seeder.seed(THERAPIST_ID, ENCRYPTED_PATH, 65_000)).rejects.toThrow('db is locked');

            expect(mockPatientRepo.persist).not.toHaveBeenCalled();
            expect(mockQueueItemRepo.persist).not.toHaveBeenCalled();
        });
    });

    describe('validation', () => {
        it('rejects an empty therapist id', async () => {
            const seeder = createSeeder();

            await expect(seeder.seed('', ENCRYPTED_PATH, 1_000)).rejects.toThrow(DevSeedException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });

        it('rejects an empty encrypted path', async () => {
            const seeder = createSeeder();

            await expect(seeder.seed(THERAPIST_ID, '', 1_000)).rejects.toThrow(DevSeedException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });

        it('rejects a zero duration', async () => {
            const seeder = createSeeder();

            await expect(seeder.seed(THERAPIST_ID, ENCRYPTED_PATH, 0)).rejects.toThrow(DevSeedException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });

        it('rejects a negative duration', async () => {
            const seeder = createSeeder();

            await expect(seeder.seed(THERAPIST_ID, ENCRYPTED_PATH, -5)).rejects.toThrow(DevSeedException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });
    });
});
