const mockLoggerFns = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
};

const mockEncounterRepo = {
    persist: jest.fn(),
};

const mockPatientUpsert = jest.fn();

const mockQueueItemRepo = {
    persist: jest.fn(),
};

jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

jest.mock('@/Database/Database', () => ({
    Database: {
        getEntityManager: () => ({
            getRepository: (EntityClass: unknown) => {
                if (EntityClass === require('../helpers/fakeEntities').FakeEncounter) {
                    return mockEncounterRepo;
                }
                return mockQueueItemRepo;
            },
            upsert: mockPatientUpsert,
        }),
    },
}));

// Real entities need Stage 3 decorator metadata that Jest cannot load — see tests/Entity.
jest.mock('@/Entity/Encounter', () => ({ Encounter: require('../helpers/fakeEntities').FakeEncounter }));
jest.mock('@/Entity/Patient', () => ({ Patient: require('../helpers/fakeEntities').FakePatient }));
jest.mock('@/Entity/QueueItem', () => ({ QueueItem: require('../helpers/fakeEntities').FakeQueueItem }));

import { FixtureLoader } from '@/DevConsole/FixtureLoader';
import { FixtureException } from '@/DevConsole/FixtureException';
import { EncounterStatus, PipelineStage, QueueItemStatus } from '@/Entity/Type';

const THERAPIST_ID = 'therapist-uuid-1';
const ENCRYPTED_PATH = '/documents/fixture_abc123.dat';

const createLoader = (): FixtureLoader => new FixtureLoader(mockLoggerFns as never);

describe('FixtureLoader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('load', () => {
        it('persists the encounter as ToProcess carrying the encrypted path and duration', async () => {
            const loader = createLoader();
            const fixture = await loader.load(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(fixture.encounter.getStatus()).toBe(EncounterStatus.ToProcess);
            expect(fixture.encounter.getTherapistId()).toBe(THERAPIST_ID);
            expect(fixture.encounter.getEncryptedAudioPaths()).toEqual([ENCRYPTED_PATH]);
            expect(fixture.encounter.getTotalDuration()).toBe(65_000);
            expect(mockEncounterRepo.persist).toHaveBeenCalledTimes(1);
            expect(mockEncounterRepo.persist).toHaveBeenCalledWith(fixture.encounter);
        });

        it('persists a patient attached to the encounter with an empty biocode', async () => {
            const loader = createLoader();
            const fixture = await loader.load(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(fixture.patient.getEncounterId()).toBe(fixture.encounter.getUuid());
            expect(fixture.patient.getBiocode()).toBe('');
            expect(mockPatientUpsert).toHaveBeenCalledTimes(1);
            expect(mockPatientUpsert).toHaveBeenCalledWith(fixture.patient);
        });

        it('persists a queue item in Waiting/Pending carrying the encounter and the encrypted path', async () => {
            const loader = createLoader();
            const fixture = await loader.load(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(fixture.queueItem.getEncounterId()).toBe(fixture.encounter.getUuid());
            expect(fixture.queueItem.getEncryptedAudioPath()).toBe(ENCRYPTED_PATH);
            expect(fixture.queueItem.getPipelineStage()).toBe(PipelineStage.Waiting);
            expect(fixture.queueItem.getStatus()).toBe(QueueItemStatus.Pending);
            expect(mockQueueItemRepo.persist).toHaveBeenCalledTimes(1);
            expect(mockQueueItemRepo.persist).toHaveBeenCalledWith(fixture.queueItem);
        });

        it('returns a summary carrying the three entity uuids', async () => {
            const loader = createLoader();
            const fixture = await loader.load(THERAPIST_ID, ENCRYPTED_PATH, 65_000);

            expect(fixture.summary).toContain(fixture.encounter.getUuid());
            expect(fixture.summary).toContain(fixture.patient.getUuid());
            expect(fixture.summary).toContain(fixture.queueItem.getUuid());
        });

        it('does not persist anything when the encounter persistence fails', async () => {
            mockEncounterRepo.persist.mockRejectedValueOnce(new Error('db is locked'));
            const loader = createLoader();

            await expect(loader.load(THERAPIST_ID, ENCRYPTED_PATH, 65_000)).rejects.toThrow('db is locked');

            expect(mockPatientUpsert).not.toHaveBeenCalled();
            expect(mockQueueItemRepo.persist).not.toHaveBeenCalled();
        });
    });

    describe('validation', () => {
        it('rejects an empty therapist id', async () => {
            const loader = createLoader();

            await expect(loader.load('', ENCRYPTED_PATH, 1_000)).rejects.toThrow(FixtureException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });

        it('rejects an empty encrypted path', async () => {
            const loader = createLoader();

            await expect(loader.load(THERAPIST_ID, '', 1_000)).rejects.toThrow(FixtureException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });

        it('rejects a zero duration', async () => {
            const loader = createLoader();

            await expect(loader.load(THERAPIST_ID, ENCRYPTED_PATH, 0)).rejects.toThrow(FixtureException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });

        it('rejects a negative duration', async () => {
            const loader = createLoader();

            await expect(loader.load(THERAPIST_ID, ENCRYPTED_PATH, -5)).rejects.toThrow(FixtureException);
            expect(mockEncounterRepo.persist).not.toHaveBeenCalled();
        });
    });
});
