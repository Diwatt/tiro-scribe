import { openDatabaseAsync } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { SqlCipherConnection } from '../../src/Database/SqlCipherConnection';
import { createMockDatabase } from '../jest/mocks/expo/expo-sqlite.mock';

const STORED_KEY = 'c'.repeat(64);

const makeEncryptedMock = () => {
    const mockDb = createMockDatabase();
    const execAsync = mockDb.execAsync as jest.Mock;
    const getFirstAsync = mockDb.getFirstAsync as jest.Mock;
    getFirstAsync.mockResolvedValue({ cipher_version: '4.5.9-community' });
    (openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(STORED_KEY);

    return { mockDb, execAsync, getFirstAsync };
};

describe('SqlCipherConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('applies the vault key as the very first statement, then verifies cipher and FTS5', async () => {
        const { mockDb, execAsync, getFirstAsync } = makeEncryptedMock();

        const database = await SqlCipherConnection.open('tiro-scribe.sqlite');

        expect(openDatabaseAsync).toHaveBeenCalledWith('tiro-scribe.sqlite');
        expect(execAsync).toHaveBeenNthCalledWith(1, `PRAGMA key = "x'${STORED_KEY}'"`);
        expect(getFirstAsync).toHaveBeenCalledWith('PRAGMA cipher_version');
        expect(execAsync).toHaveBeenCalledWith(
            'CREATE VIRTUAL TABLE IF NOT EXISTS temp.fts5_probe USING fts5(content)',
        );
        expect(database).toBe(mockDb);
    });

    it('rejects DATABASE_NOT_ENCRYPTED when the cipher is not active', async () => {
        const { getFirstAsync } = makeEncryptedMock();
        getFirstAsync.mockResolvedValue(null);

        await expect(SqlCipherConnection.open('tiro-scribe.sqlite')).rejects.toMatchObject({
            code: 'DATABASE_NOT_ENCRYPTED',
        });
    });

    it('rejects DATABASE_FTS5_UNAVAILABLE when the fts5 probe fails', async () => {
        const { execAsync } = makeEncryptedMock();
        execAsync.mockImplementation(async (sql: string) => {
            if (sql.includes('fts5_probe')) {
                throw new Error('no such module: fts5');
            }
        });

        await expect(SqlCipherConnection.open('tiro-scribe.sqlite')).rejects.toMatchObject({
            code: 'DATABASE_FTS5_UNAVAILABLE',
        });
    });
});
