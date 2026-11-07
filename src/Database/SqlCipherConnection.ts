/**
 * SqlCipherConnection – Opens an expo-sqlite connection encrypted with SQLCipher:
 * applies the RAM-held key as the very first statement on the connection. The
 * key comes from the caller — decrypted from the keyfile after user auth, or
 * generated in RAM during onboarding (cf. docs/AUTH_GATED_BOOT.md). The
 * database file stays unreadable on disk without that key. Build-time
 * invariants (cipher active, FTS5 available) are verified on dev startups
 * only; production ships the committed, verified gradle config.
 */

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { DatabaseException } from '@/Exception';

export class SqlCipherConnection {
    private static readonly errorCodeFts5Unavailable = 'DATABASE_FTS5_UNAVAILABLE';
    private static readonly errorCodeNotEncrypted = 'DATABASE_NOT_ENCRYPTED';

    public static async open(databaseName: string, dbKeyHex: string): Promise<SQLiteDatabase> {
        const database = await openDatabaseAsync(databaseName);

        // SQLCipher: the key must be the very first statement on the connection.
        await database.execAsync(`PRAGMA key = "x'${dbKeyHex}'"`);

        if (__DEV__) {
            await SqlCipherConnection.verifyBuild(database);
        }

        return database;
    }

    private static async verifyBuild(database: SQLiteDatabase): Promise<void> {
        const cipher = await database.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
        if (cipher == null || cipher.cipher_version.length === 0) {
            throw new DatabaseException(
                'SQLCipher is not active on this connection: the database would be stored in plaintext.',
                SqlCipherConnection.errorCodeNotEncrypted,
            );
        }

        try {
            await database.execAsync('CREATE VIRTUAL TABLE IF NOT EXISTS temp.fts5_probe USING fts5(content)');
            await database.execAsync('DROP TABLE IF EXISTS temp.fts5_probe');
        } catch (_error: unknown) {
            throw new DatabaseException(
                'FTS5 is unavailable in this SQLite build: the hybrid lexical search requires it.',
                SqlCipherConnection.errorCodeFts5Unavailable,
            );
        }
    }
}
