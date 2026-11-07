/**
 * DatabaseKeyfile – Owns the encrypted form of the SQLCipher database key.
 * The dbKey is random and never persisted in clear: the keyfile carries it
 * encrypted twice, under a password-derived key and under a recovery-code
 * derived key. The auth-gated boot decrypts it in RAM only (cf.
 * docs/AUTH_GATED_BOOT.md). A biometry slot is reserved in the format for v2.
 */

import { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { z } from 'zod';
import { Container } from '@/Core/Container';
import { InvalidKeyfileException } from '@/Exception';
import { CryptoEngine } from './CryptoEngine';
import { RecoveryCode } from './RecoveryCode';

/** Input for building the keyfile at vault creation. */
export interface DatabaseKeyfileCreateInput {
    dbKey: string;
    password: string;
    recoveryCode: string;
    therapistUuid: string;
}

export class DatabaseKeyfile {
    public static readonly VERSION = 1;
    public static readonly FILE_NAME = 'keyfile.json';

    private static readonly PASSWORD_SALT_TAG = 'dbkey_password';
    private static readonly RECOVERY_SALT_TAG = 'dbkey_recovery';

    public static readonly slotSchema = z.object({
        salt: z.string().min(1),
        encrypted: z.string().min(1),
    });

    public static readonly schema = z.object({
        version: z.literal(DatabaseKeyfile.VERSION),
        slots: z.object({
            password: DatabaseKeyfile.slotSchema,
            recovery: DatabaseKeyfile.slotSchema,
            biometry: z
                .object({
                    alias: z.string().min(1),
                    encrypted: z.string().min(1),
                })
                .optional(),
        }),
    });

    public constructor(
        private readonly crypto: CryptoEngine,
        private readonly recovery: RecoveryCode,
    ) {}

    /** Re-encrypts the password slot under a new password; the recovery slot is untouched. */
    public changePassword(content: DatabaseKeyfileData, dbKey: string, newPassword: string): DatabaseKeyfileData {
        const slot = content.slots.password;
        const encrypted = this.crypto.encrypt(dbKey, this.crypto.keyFromPassword(newPassword, slot.salt));

        return {
            ...content,
            slots: {
                ...content.slots,
                password: { salt: slot.salt, encrypted },
            },
        };
    }

    /** Builds the keyfile content at vault creation: dbKey encrypted under password + recovery code. */
    public create(input: DatabaseKeyfileCreateInput): DatabaseKeyfileData {
        const passwordSalt = this.crypto.salt(input.therapistUuid, DatabaseKeyfile.PASSWORD_SALT_TAG);
        const recoverySalt = this.crypto.salt(input.therapistUuid, DatabaseKeyfile.RECOVERY_SALT_TAG);

        return {
            version: DatabaseKeyfile.VERSION,
            slots: {
                password: {
                    salt: passwordSalt,
                    encrypted: this.crypto.encrypt(input.dbKey, this.crypto.keyFromPassword(input.password, passwordSalt)),
                },
                recovery: {
                    salt: recoverySalt,
                    encrypted: this.crypto.encrypt(input.dbKey, this.recovery.keyFromCode(input.recoveryCode, recoverySalt)),
                },
            },
        };
    }

    /** Decrypts the dbKey with the password; null when the password is wrong. */
    public decryptWithPassword(content: DatabaseKeyfileData, password: string): string | null {
        const slot = content.slots.password;

        return this.decryptOrNull(slot, this.crypto.keyFromPassword(password, slot.salt));
    }

    /** Decrypts the dbKey with the recovery code; null when the code is wrong. */
    public decryptWithRecoveryCode(content: DatabaseKeyfileData, recoveryCode: string): string | null {
        const slot = content.slots.recovery;

        return this.decryptOrNull(slot, this.recovery.keyFromCode(recoveryCode, slot.salt));
    }

    public async exists(): Promise<boolean> {
        const info = await getInfoAsync(DatabaseKeyfile.filePath());

        return info.exists;
    }

    /** Parses and validates keyfile JSON from disk; throws on invalid JSON, shape or version. */
    public parse(rawJson: string): DatabaseKeyfileData {
        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(rawJson) as unknown;
        } catch (error: unknown) {
            throw new InvalidKeyfileException(
                'The keyfile is not valid JSON.',
                error instanceof Error ? error : undefined,
            );
        }

        const result = DatabaseKeyfile.schema.safeParse(parsedJson);
        if (!result.success) {
            throw new InvalidKeyfileException(
                'The keyfile content is invalid or carries an unsupported version.',
                result.error,
            );
        }

        return result.data;
    }

    public async read(): Promise<DatabaseKeyfileData> {
        const raw = await readAsStringAsync(DatabaseKeyfile.filePath());

        return this.parse(raw);
    }

    public async write(content: DatabaseKeyfileData): Promise<void> {
        await writeAsStringAsync(DatabaseKeyfile.filePath(), JSON.stringify(content));
    }

    private decryptOrNull(slot: DatabaseKeyfileSlot, wrapKeyHex: string): string | null {
        try {
            return this.crypto.decrypt(slot.encrypted, wrapKeyHex);
        } catch (_error: unknown) {
            return null;
        }
    }

    private static filePath(): string {
        return `${documentDirectory ?? ''}SQLite/${DatabaseKeyfile.FILE_NAME}`;
    }
}

export type DatabaseKeyfileData = z.infer<typeof DatabaseKeyfile.schema>;
export type DatabaseKeyfileSlot = z.infer<typeof DatabaseKeyfile.slotSchema>;

Container.register(DatabaseKeyfile, () => new DatabaseKeyfile(Container.get(CryptoEngine), Container.get(RecoveryCode)));
