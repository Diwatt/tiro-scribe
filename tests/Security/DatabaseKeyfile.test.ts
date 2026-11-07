import { InvalidKeyfileException } from '@/Exception';
import { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { CryptoEngine } from '@/Security/CryptoEngine';
import { DatabaseKeyfile } from '@/Security/DatabaseKeyfile';
import { RecoveryCode } from '@/Security/RecoveryCode';

describe('DatabaseKeyfile', () => {
    const crypto = new CryptoEngine();
    const recovery = new RecoveryCode();
    const keyfile = new DatabaseKeyfile(crypto, recovery);

    const dbKey = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8550';
    const password = 'correct-horse-42';
    const wrongPassword = 'wrong-password';
    const recoveryCode = 'ABCD-EFGH-JKLM';
    const wrongCode = 'WXYZ-9876-5432';
    const therapistUuid = 'thera-1';

    const createContent = () =>
        keyfile.create({
            dbKey,
            password,
            recoveryCode,
            therapistUuid,
        });

    describe('create + parse round-trip', () => {
        it('decrypts the dbKey with the password after a JSON round-trip', () => {
            const content = keyfile.parse(JSON.stringify(createContent()));

            expect(keyfile.decryptWithPassword(content, password)).toBe(dbKey);
        });

        it('decrypts the dbKey with the recovery code after a JSON round-trip', () => {
            const content = keyfile.parse(JSON.stringify(createContent()));

            expect(keyfile.decryptWithRecoveryCode(content, recoveryCode)).toBe(dbKey);
        });

        it('never carries the dbKey in clear in the serialized file', () => {
            const json = JSON.stringify(createContent());

            expect(json).not.toContain(dbKey);
        });
    });

    describe('decryptWithPassword', () => {
        it('returns null on a wrong password', () => {
            const content = createContent();

            expect(keyfile.decryptWithPassword(content, wrongPassword)).toBeNull();
        });
    });

    describe('decryptWithRecoveryCode', () => {
        it('returns null on a wrong recovery code', () => {
            const content = createContent();

            expect(keyfile.decryptWithRecoveryCode(content, wrongCode)).toBeNull();
        });
    });

    describe('parse', () => {
        it('throws InvalidKeyfileException on invalid JSON', () => {
            expect(() => keyfile.parse('not-json{')).toThrow(InvalidKeyfileException);
        });

        it('throws InvalidKeyfileException on an unsupported version', () => {
            const content = createContent();
            const tampered = JSON.stringify({ ...content, version: 99 });

            expect(() => keyfile.parse(tampered)).toThrow(InvalidKeyfileException);
        });

        it('throws InvalidKeyfileException when a slot is missing', () => {
            const content = JSON.parse(JSON.stringify(createContent()));
            delete content.slots.recovery;

            expect(() => keyfile.parse(JSON.stringify(content))).toThrow(InvalidKeyfileException);
        });
    });

    describe('changePassword', () => {
        it('decrypts the dbKey with the new password and no longer with the old one', () => {
            const content = createContent();
            const rotated = keyfile.changePassword(content, dbKey, 'new-password-99');

            expect(keyfile.decryptWithPassword(rotated, 'new-password-99')).toBe(dbKey);
            expect(keyfile.decryptWithPassword(rotated, password)).toBeNull();
        });

        it('keeps the recovery slot working untouched', () => {
            const content = createContent();
            const rotated = keyfile.changePassword(content, dbKey, 'new-password-99');

            expect(keyfile.decryptWithRecoveryCode(rotated, recoveryCode)).toBe(dbKey);
        });

        it('still never carries the dbKey in clear in the serialized file', () => {
            const rotated = keyfile.changePassword(createContent(), dbKey, 'new-password-99');

            expect(JSON.stringify(rotated)).not.toContain(dbKey);
        });
    });

    describe('disk I/O', () => {
        const filePath = `${documentDirectory ?? ''}SQLite/${DatabaseKeyfile.FILE_NAME}`;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('writes the serialized keyfile to the SQLite directory', async () => {
            const content = createContent();

            await keyfile.write(content);

            expect(writeAsStringAsync).toHaveBeenCalledWith(filePath, JSON.stringify(content));
        });

        it('reads back and decrypts the stored keyfile', async () => {
            const content = createContent();
            (readAsStringAsync as jest.Mock).mockResolvedValue(JSON.stringify(content));

            const read = await keyfile.read();

            expect(readAsStringAsync).toHaveBeenCalledWith(filePath);
            expect(keyfile.decryptWithPassword(read, password)).toBe(dbKey);
        });

        it('reports existence from the file info', async () => {
            (getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

            expect(await keyfile.exists()).toBe(false);
            expect(getInfoAsync).toHaveBeenCalledWith(filePath);
        });
    });
});
