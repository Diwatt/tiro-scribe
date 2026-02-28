import { Database } from '@/Database/Database';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Kysely } from 'kysely';
import { ExpoDialect } from 'kysely-expo';
import { appConfig } from '@/Config/AppConfig';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { appLogger } from '@/Service/Logger';

vi.mock('@/Service/Logger', () => ({
    appLogger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('kysely', async (importOriginal) => {
    const actual = await importOriginal<typeof import('kysely')>();
    return {
        ...actual,
        Kysely: vi.fn().mockImplementation(() => ({
            getExecutor: vi.fn().mockReturnValue({ adapter: { supportsTransactionalDdl: () => true } }),
            schema: {
                createTable: vi.fn().mockReturnThis(),
                ifNotExists: vi.fn().mockReturnThis(),
                addColumn: vi.fn().mockReturnThis(),
                execute: vi.fn(),
            },
            transaction: vi.fn().mockReturnValue({
                execute: vi.fn(async (cb) => {
                    const mockTrx = {
                        executeQuery: vi.fn(),
                        getExecutor: vi.fn().mockReturnValue({ adapter: { supportsTransactionalDdl: () => true } }),
                    };
                    return cb(mockTrx);
                }),
            }),
            executeQuery: vi.fn(),
            destroy: vi.fn(),
        })),
        sql: Object.assign(
            (strings: TemplateStringsArray, ...values: any[]) => ({
                compile: () => ({ sql: 'MOCKED_SQL', parameters: [] }),
            }),
            {
                raw: (s: string) => ({ compile: () => ({ sql: s, parameters: [] }) }),
            }
        ),
    };
});
vi.mock('kysely-expo');

// Mock the singleton qb instance
vi.mock('@/Database/Kysely', () => {
    const mockSchema = {
        createIndex: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        column: vi.fn().mockReturnThis(),
        ifNotExists: vi.fn().mockReturnThis(),
        compile: vi.fn().mockReturnValue({ sql: 'MOCKED_INDEX_SQL' }),
    };

    return {
        qb: {
            transaction: vi.fn().mockReturnValue({
                execute: vi.fn(async (cb) => {
                    const mockTrx = {
                        executeQuery: vi.fn().mockResolvedValue({ rows: [] }),
                        getExecutor: vi.fn().mockReturnValue({ adapter: { supportsTransactionalDdl: () => true } }),
                        schema: mockSchema,
                    };
                    return cb(mockTrx);
                }),
            }),
            executeQuery: vi.fn().mockResolvedValue({ rows: [] }),
            destroy: vi.fn(),
            schema: mockSchema,
        }
    };
});

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
        const logger = appLogger;
        const spy = vi.spyOn(logger, 'info');

        await Database.reset();

        expect(spy).toHaveBeenCalledWith('[Database] resetting database at', expect.objectContaining({ path: expect.stringContaining(appConfig.databaseName) }));
    });
});
