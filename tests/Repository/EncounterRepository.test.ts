import { Encounter } from '@/Entity/Encounter';
import { EncounterStatus } from '@/Entity/Type';
import { EncounterNotFound } from '@/Exception/EncounterNotFound';
import { Therapist } from '@/Entity/Therapist';
import { createTestOrm } from '../helpers/mikroOrm';

describe('EncounterRepository', () => {
    test('updateStatus persists status and duration', async () => {
        const orm = await createTestOrm([Therapist, Encounter]);
        const em = orm.em;
        const therapist = new Therapist();
        await em.upsert(therapist);

        const encounter = new Encounter({ therapistId: therapist.uuid });
        await em.upsert(encounter);

        await em.getRepository(Encounter).updateStatus(encounter, EncounterStatus.Completed, 1200);

        em.clear();
        const found = await em.findOne(Encounter, encounter.uuid);
        expect(found?.getStatus()).toBe(EncounterStatus.Completed);
        expect(found?.getTotalDuration()).toBe(1200);
        await orm.close(true);
    });

    test('updateStatus throws EncounterNotFound for an unstored encounter', async () => {
        const orm = await createTestOrm([Therapist, Encounter]);
        const ghost = new Encounter({ therapistId: 'missing' });
        await expect(
            orm.em.getRepository(Encounter).updateStatus(ghost, EncounterStatus.Completed),
        ).rejects.toBeInstanceOf(EncounterNotFound);
        await orm.close(true);
    });

    test('addRecording attaches path and flips status to ToProcess', async () => {
        const orm = await createTestOrm([Therapist, Encounter]);
        const em = orm.em;
        const therapist = new Therapist();
        await em.upsert(therapist);
        const encounter = new Encounter({ therapistId: therapist.uuid });
        await em.upsert(encounter);

        await em.getRepository(Encounter).addRecording(encounter, 'x.enc', 500);

        em.clear();
        const found = await em.findOne(Encounter, encounter.uuid);
        expect(found?.getStatus()).toBe(EncounterStatus.ToProcess);
        expect(found?.getEncryptedAudioPaths()).toEqual(['x.enc']);
        await orm.close(true);
    });
});
