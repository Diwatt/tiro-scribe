import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DownloadQueue } from '@/Entity/DownloadQueue';
import { DownloadQueueStatus } from '@/Entity/Type';
import { createTestOrm } from '../helpers/mikroOrm';

dayjs.extend(utc);

describe('DownloadQueueRepository', () => {
    test('findByCapability filters by capability', async () => {
        const orm = await createTestOrm([DownloadQueue]);
        const repo = orm.em.getRepository(DownloadQueue);
        await repo.persist(new DownloadQueue({ capability: 'asr', language: 'fr' }));
        await repo.persist(new DownloadQueue({ capability: 'vad', language: 'fr' }));

        expect((await repo.findByCapability('asr')).length).toBe(1);
        await orm.close(true);
    });

    test('findByCapabilityAndLanguage narrows on both fields', async () => {
        const orm = await createTestOrm([DownloadQueue]);
        const repo = orm.em.getRepository(DownloadQueue);
        await repo.persist(new DownloadQueue({ capability: 'asr', language: 'fr' }));
        await repo.persist(new DownloadQueue({ capability: 'asr', language: 'en' }));

        const results = await repo.findByCapabilityAndLanguage('asr', 'en');
        expect(results.length).toBe(1);
        expect(results[0]?.getLanguage()).toBe('en');
        await orm.close(true);
    });

    test('findOldestPending returns the earliest pending item, then the next once drained', async () => {
        const orm = await createTestOrm([DownloadQueue]);
        const repo = orm.em.getRepository(DownloadQueue);
        const older = new DownloadQueue({ capability: 'asr', createdAt: dayjs.utc('2026-01-01T00:00:00Z') });
        const newer = new DownloadQueue({ capability: 'asr', createdAt: dayjs.utc('2026-02-01T00:00:00Z') });
        await repo.persist(older);
        await repo.persist(newer);

        expect((await repo.findOldestPending())?.getUuid()).toBe(older.uuid);

        const managed = await repo.findOne(older.uuid);
        managed!.status = DownloadQueueStatus.Completed;
        await repo.persist(managed!);

        const nextOldest = await repo.findOldestPending();
        expect(nextOldest?.getUuid()).toBe(newer.uuid);
        await orm.close(true);
    });

    test('findOldestPending returns null when nothing is pending', async () => {
        const orm = await createTestOrm([DownloadQueue]);
        const repo = orm.em.getRepository(DownloadQueue);
        await repo.persist(DownloadQueue.createCompleted('asr'));

        expect(await repo.findOldestPending()).toBeNull();
        await orm.close(true);
    });

    test('findProcessable includes failed items with retries left only', async () => {
        const orm = await createTestOrm([DownloadQueue]);
        const repo = orm.em.getRepository(DownloadQueue);
        const failedRetryLeft = new DownloadQueue({ capability: 'asr', status: DownloadQueueStatus.Failed, nbRetries: 1, maxRetries: 3 });
        const failedExhausted = new DownloadQueue({ capability: 'asr', status: DownloadQueueStatus.Failed, nbRetries: 3, maxRetries: 3 });
        const done = new DownloadQueue({ capability: 'asr', status: DownloadQueueStatus.Completed });
        await repo.persist(failedRetryLeft);
        await repo.persist(failedExhausted);
        await repo.persist(done);

        const uuids = (await repo.findProcessable()).map((item) => item.getUuid());
        expect(uuids).toContain(failedRetryLeft.uuid);
        expect(uuids).not.toContain(failedExhausted.uuid);
        expect(uuids).not.toContain(done.uuid);
        await orm.close(true);
    });

    test('getStats aggregates per status (Paused counts as pending)', async () => {
        const orm = await createTestOrm([DownloadQueue]);
        const repo = orm.em.getRepository(DownloadQueue);
        await repo.persist(new DownloadQueue({ capability: 'a', status: DownloadQueueStatus.Pending }));
        await repo.persist(new DownloadQueue({ capability: 'a', status: DownloadQueueStatus.Paused }));
        await repo.persist(new DownloadQueue({ capability: 'a', status: DownloadQueueStatus.Completed }));

        expect(await repo.getStats()).toEqual({ total: 3, pending: 2, active: 0, completed: 1, failed: 0 });
        await orm.close(true);
    });
});
