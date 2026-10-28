/**
 * CryptoEngine – Crypto wrapper (hash, AES, password key derivation, random).
 * Uses react-native-quick-crypto for native performance.
 */

import * as ExpoCrypto from 'expo-crypto';
import QuickCrypto, { Buffer } from 'react-native-quick-crypto';
import { Container } from '@/Core/Container';

export class CryptoEngine {
    public static readonly ALGORITHM = 'aes-256-gcm';
    public static readonly AUTH_TAG_BYTES = 16;
    public static readonly IV_BYTES = 12;
    public static readonly KEY_LEN = 32;
    public static readonly PBKDF2_PASSWORD_ITERATIONS = 600_000;
    public static readonly PBKDF2_PRF_ITERATIONS = 1_000;

    public decrypt(ciphertext: string, keyHex: string): string {
        const key = Buffer.from(keyHex, 'hex');
        const combined = Buffer.from(ciphertext, 'base64');
        const iv = combined.subarray(0, CryptoEngine.IV_BYTES);
        const authTag = combined.subarray(CryptoEngine.IV_BYTES, CryptoEngine.IV_BYTES + CryptoEngine.AUTH_TAG_BYTES);
        const ct = combined.subarray(CryptoEngine.IV_BYTES + CryptoEngine.AUTH_TAG_BYTES);
        const decipher = QuickCrypto.createDecipheriv(CryptoEngine.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    }

    public encrypt(plaintext: string, keyHex: string): string {
        const key = Buffer.from(keyHex, 'hex');
        const iv = Buffer.from(ExpoCrypto.getRandomBytes(CryptoEngine.IV_BYTES));
        const cipher = QuickCrypto.createCipheriv(CryptoEngine.ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const combined = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
        return combined.toString('base64');
    }

    /**
     * Derive a deterministic byte sequence from key material.
     * Uses PBKDF2 + AES-256-CTR as a PRF (pseudorandom function).
     * @param keyHex - hex-encoded key material
     * @param salt - additional salt string
     * @param byteLength - number of bytes to produce
     * @returns Buffer of deterministic random bytes
     */
    public generateDeterministicBytes(keyHex: string, salt: string, byteLength: number): Buffer {
        // PRF, not password hardening: iterations stay low (see PBKDF2_PRF_ITERATIONS)
        const key = QuickCrypto.pbkdf2Sync(keyHex, salt, CryptoEngine.PBKDF2_PRF_ITERATIONS, CryptoEngine.KEY_LEN, 'sha256');
        
        // Use AES-256-CTR as a stream cipher (no size limits)
        const cipher = QuickCrypto.createCipheriv('aes-256-ctr', key, Buffer.alloc(16, 0)); // IV = zero
        
        let result = cipher.update(Buffer.alloc(byteLength, 0));
        result = Buffer.concat([result, cipher.final()]);
        
        return result.subarray(0, byteLength);
    }

    public hash(text: string): string {
        return QuickCrypto.createHash('sha256').update(text).digest().toString('hex');
    }

    public keyFromPassword(password: string, salt: string): string {
        const derived = QuickCrypto.pbkdf2Sync(
            password,
            salt,
            CryptoEngine.PBKDF2_PASSWORD_ITERATIONS,
            CryptoEngine.KEY_LEN,
            'SHA-256',
        );
        return derived.toString('hex');
    }

    public randomKey(byteLength: number): string {
        const bytes = ExpoCrypto.getRandomBytes(byteLength);
        return Buffer.from(bytes).toString('hex');
    }

    public salt(uuid: string, tag: string): string {
        return `scribe_${tag}_${uuid}`;
    }
}

Container.register(CryptoEngine, () => new CryptoEngine());
