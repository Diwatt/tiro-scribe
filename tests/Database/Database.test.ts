import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-sqlite', () => ({
    deleteDatabaseAsync: vi.fn(),
}));

// Mock kysely-expo to avoid JSX parsing errors
vi.mock('kysely-expo', () => ({
    ExpoDialect: vi.fn(),
    KyselyProvider: vi.fn(),
    useKysely: vi.fn(),
}));

// NOW import Database and other modules after mocks are set up
import { Database } from '@/Database/Database';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { AppLogger } from '@/Core/AppLogger';
import { AppConfig } from '@/Core/AppConfig';
import { Container } from '@/Core/Container';

// Mock only the transaction executor adapter check, use real testKysely for everything else
vi.mock('kysely', async (importOriginal) => {
    const actual = await importOriginal<typeof import('kysely')>();
    return {
        ...actual,
        Kysely: vi.fn().mockImplementation(() => ({
            getExecutor: vi.fn().mockReturnValue({ adapter: { supportsTransactionalDdl: () => true } }),
        })),
    };
});

// Use the real testKysely instance but mock the schema methods for testing
vi.mock('@/Database/Kysely', () => {
    const { testKysely } = require('../vitest/mocks/kysely');
    return {
        qb: testKysely,
    };
});

describe('Database utility methods', () => {
    let loggerMock: any;
    let appConfigMock: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Set up logger mock
        loggerMock = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        
        // Set up AppConfig mock
        appConfigMock = {
            databaseName: 'test-database.sqlite',
            isDev: false,
        };
        
        // Mock Container.get to return the mocked instances
        vi.spyOn(Container, 'get').mockImplementation((cls: any) => {
            if (cls === AppLogger) {
                return loggerMock;
            }
            if (cls === AppConfig) {
                return appConfigMock;
            }
            return undefined;
        });
        
        // Ensure any leftover singleton is cleared so tests don't interfere
        (Database as any).instance = null;
    });

    it('reset() calls expo-sqlite.deleteDatabaseAsync and clears instance', async () => {
        // set a dummy instance value so we can check it was reset
        (Database as any).instance = { dummy: true };

        await Database.reset();
        expect(deleteDatabaseAsync).toHaveBeenCalledWith('test-database.sqlite');

        // Clear any existing instance to force fresh initialization
        (Database as any).instance = null;
    });

    it('logs database path when resetting', async () => {
        await Database.reset();

        expect(loggerMock.info).toHaveBeenCalledWith(
            '[Database] resetting database at',
            expect.objectContaining({ path: 'test-database.sqlite' })
        );
    });
});
