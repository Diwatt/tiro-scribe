import { Database } from '@/Database/Database';
import { appConfig } from '@/Config/AppConfig';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { AppLogger } from '@/Service/Logger';

// expo-sqlite is already mocked in vitest/setup.ts; we only need to clear
// mocks before each test so call counts reset.

describe('Database utility methods', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // ensure any leftover singleton is cleared so tests don't interfere
        // we can't access private static `instance` directly from TS, but we can
        // reset via any-cast hack for testing purposes.
        (Database as any).instance = null;
    });

    it('reset() calls expo-sqlite.deleteDatabaseAsync and clears instance', async () => {
        // set a dummy instance value so we can check it was reset
        (Database as any).instance = { dummy: true };

        await Database.reset();
        expect(deleteDatabaseAsync).toHaveBeenCalledWith(appConfig.databaseName);
        expect((Database as any).instance).toBeNull();
    });

    it('initialize() still works after reset', async () => {
        await Database.reset();
        // initialize should create a fresh instance without throwing
        await expect(Database.initialize()).resolves.not.toThrow();
        expect(Database.getConnection()).toBeDefined();
    });


    it('logs database path when resetting', async () => {
        const logger = AppLogger.getInstance();
        const spy = vi.spyOn(logger, 'info');

        await Database.reset();

        expect(spy).toHaveBeenCalledWith('[Database] resetting database at', expect.objectContaining({ path: expect.stringContaining(appConfig.databaseName) }));
    });
});
