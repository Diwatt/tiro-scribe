import { Container } from '@/Core/Container';
import { Therapist } from '@/Entity/Therapist';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { createTestOrm } from '../helpers/mikroOrm';

describe('TherapistRepository', () => {
    test('persist + findCurrent round-trip', async () => {
        const orm = await createTestOrm([Therapist]);
        const repo = orm.em.getRepository(Therapist);

        const therapist = new Therapist({ email: 'v@tiro.dev' });
        await repo.persist(therapist);

        const found = await repo.findCurrent();
        expect(found?.getEmail()).toBe('v@tiro.dev');
        await orm.close(true);
    });

    test('findCurrent returns undefined on an empty table', async () => {
        const orm = await createTestOrm([Therapist]);
        expect(await orm.em.getRepository(Therapist).findCurrent()).toBeUndefined();
        await orm.close(true);
    });

    test('hasActiveSession is false without a therapist', async () => {
        const orm = await createTestOrm([Therapist]);
        expect(await orm.em.getRepository(Therapist).hasActiveSession()).toBe(false);
        await orm.close(true);
    });

    test('hasActiveSession delegates to the vault when a therapist exists', async () => {
        const fakeVault = { exists: jest.fn().mockReturnValue(true), save: jest.fn() };
        Container.register(MasterKeyVault as never, () => fakeVault as never);

        const orm = await createTestOrm([Therapist]);
        const repo = orm.em.getRepository(Therapist);
        await repo.persist(new Therapist());

        expect(await repo.hasActiveSession()).toBe(true);
        expect(fakeVault.exists).toHaveBeenCalled();
        await orm.close(true);
    });
});
