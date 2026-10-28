import { Encounter } from '@/Entity/Encounter';
import { Patient } from '@/Entity/Patient';
import { ProsodyMetrics } from '@/Entity/ProsodyMetrics';
import { Therapist } from '@/Entity/Therapist';
import { Transcription } from '@/Entity/Transcription';
import { createTestOrm } from '../helpers/mikroOrm';

describe('FK delete rules', () => {
    test('deleting an Encounter cascades to Patient, Transcription, ProsodyMetrics', async () => {
        const orm = await createTestOrm([Therapist, Encounter, Patient, Transcription, ProsodyMetrics]);
        const em = orm.em;
        const therapist = new Therapist();
        await em.upsert(therapist);
        const encounter = new Encounter({ therapistId: therapist.uuid });
        await em.upsert(encounter);

        const patient = new Patient({ encounterId: encounter.uuid });
        const transcription = new Transcription({ encounterId: encounter.uuid });
        const prosody = new ProsodyMetrics({ encounterId: encounter.uuid });
        await em.upsert(patient);
        await em.upsert(transcription);
        await em.upsert(prosody);

        await em.nativeDelete(Encounter, encounter.uuid);
        // vider l'identity map : findOne par PK sert le cache sinon
        em.clear();

        expect(await em.findOne(Patient, patient.uuid)).toBeNull();
        expect(await em.findOne(Transcription, transcription.uuid)).toBeNull();
        expect(await em.findOne(ProsodyMetrics, prosody.uuid)).toBeNull();
        await orm.close(true);
    });

    test('deleting a Therapist is restricted while an encounter references it', async () => {
        const orm = await createTestOrm([Therapist, Encounter]);
        const em = orm.em;
        const therapist = new Therapist();
        await em.upsert(therapist);
        await em.upsert(new Encounter({ therapistId: therapist.uuid }));

        await expect(em.nativeDelete(Therapist, therapist.uuid)).rejects.toThrow();
        await orm.close(true);
    });
});
