/**
 * CryptoEngine – Crypto wrapper (hash, AES, password key derivation, random).
 * Uses react-native-quick-crypto for native performance.
 */

import * as ExpoCrypto from 'expo-crypto';
import QuickCrypto, { Buffer } from 'react-native-quick-crypto';

export class CryptoEngine {
    private static readonly PBKDF2_ITERATIONS = 100_000;
    private static readonly KEY_LEN = 32;
    private static readonly IV_BYTES = 16;
    private static readonly ALGORITHM = 'aes-256-cbc';

    public hash(text: string): string {
        return QuickCrypto.createHash('sha256').update(text).digest().toString('hex');
    }

    public encrypt(plaintext: string, keyHex: string): string {
        const key = Buffer.from(keyHex, 'hex');
        const iv = Buffer.from(ExpoCrypto.getRandomBytes(CryptoEngine.IV_BYTES));
        const cipher = QuickCrypto.createCipheriv(CryptoEngine.ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const combined = Buffer.concat([iv, encrypted]);
        return combined.toString('base64');
    }

    public decrypt(ciphertext: string, keyHex: string): string {
        const key = Buffer.from(keyHex, 'hex');
        const combined = Buffer.from(ciphertext, 'base64');
        const iv = combined.subarray(0, CryptoEngine.IV_BYTES);
        const ct = combined.subarray(CryptoEngine.IV_BYTES);
        const decipher = QuickCrypto.createDecipheriv(CryptoEngine.ALGORITHM, key, iv);
        return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    }

    public randomKey(byteLength: number): string {
        const bytes = ExpoCrypto.getRandomBytes(byteLength);
        return Buffer.from(bytes).toString('hex');
    }

    public salt(uuid: string, tag: string): string {
        return `scribe_${tag}_${uuid}`;
    }

    public keyFromPassword(password: string, salt: string): string {
        const derived = QuickCrypto.pbkdf2Sync(password, salt, CryptoEngine.PBKDF2_ITERATIONS, CryptoEngine.KEY_LEN, 'SHA-256');
        return derived.toString('hex');
    }
}
