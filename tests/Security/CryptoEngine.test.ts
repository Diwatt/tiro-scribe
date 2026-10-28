import { CryptoEngine } from '@/Security/CryptoEngine';

describe('CryptoEngine', () => {
    const crypto = new CryptoEngine();

    describe('configuration', () => {
        it('uses AES-256-GCM for authenticated encryption', () => {
            expect(CryptoEngine.ALGORITHM).toBe('aes-256-gcm');
        });

        it('derives password keys with OWASP-recommended PBKDF2 iteration count (>= 600k)', () => {
            expect(CryptoEngine.PBKDF2_PASSWORD_ITERATIONS).toBeGreaterThanOrEqual(600_000);
        });
    });

    describe('salt', () => {
        it('returns tag-prefixed string with uuid', () => {
            expect(crypto.salt('uuid-1', 'vault_primary')).toBe('scribe_vault_primary_uuid-1');
        });

        it('uses different tags', () => {
            expect(crypto.salt('u', 'tag_a')).toBe('scribe_tag_a_u');
        });
    });

    describe('keyFromPassword', () => {
        it('returns hex string', () => {
            const key = crypto.keyFromPassword('password', 'salt');
            expect(typeof key).toBe('string');
            expect(key).toMatch(/^[0-9a-f]+$/);
        });

        it('same password and salt produce same key', () => {
            const a = crypto.keyFromPassword('p', 's');
            const b = crypto.keyFromPassword('p', 's');
            expect(a).toBe(b);
        });

        it('different salt produces different key', () => {
            const a = crypto.keyFromPassword('p', 's1');
            const b = crypto.keyFromPassword('p', 's2');
            expect(a).not.toBe(b);
        });
    });

    describe('encrypt / decrypt', () => {
        const key = crypto.keyFromPassword('therapist-passphrase', 'scribe_vault_uuid-1');

        it('round-trips plaintext through encrypt then decrypt', () => {
            const plaintext = 'Clinical note: patient discussed session start.';

            const ciphertext = crypto.encrypt(plaintext, key);

            expect(crypto.decrypt(ciphertext, key)).toBe(plaintext);
        });

        it('formats ciphertext as base64 of IV (12) || auth tag (16) || encrypted bytes', () => {
            const combined = Buffer.from(crypto.encrypt('A'.repeat(30), key), 'base64');

            expect(combined.length).toBe(CryptoEngine.IV_BYTES + CryptoEngine.AUTH_TAG_BYTES + 30);
        });

        it('produces different ciphertexts for the same plaintext (random IV)', () => {
            const plaintext = 'same session, two captures';

            const first = crypto.encrypt(plaintext, key);
            const second = crypto.encrypt(plaintext, key);

            expect(first).not.toBe(second);
            expect(crypto.decrypt(first, key)).toBe(plaintext);
            expect(crypto.decrypt(second, key)).toBe(plaintext);
        });

        it('fails to decrypt with a different key', () => {
            const plaintext = 'secret';
            const ciphertext = crypto.encrypt(plaintext, key);
            const otherKey = crypto.keyFromPassword('therapist-passphrase', 'scribe_vault_uuid-2');

            expect(() => crypto.decrypt(ciphertext, otherKey)).toThrow();
        });

        it('rejects tampered ciphertext (GCM authentication)', () => {
            const combined = Buffer.from(crypto.encrypt('clinical note', key), 'base64');
            combined[combined.length - 1] ^= 0xff;

            expect(() => crypto.decrypt(combined.toString('base64'), key)).toThrow();
        });

        it('rejects a corrupted auth tag', () => {
            const combined = Buffer.from(crypto.encrypt('clinical note', key), 'base64');
            combined[CryptoEngine.IV_BYTES] ^= 0xff;

            expect(() => crypto.decrypt(combined.toString('base64'), key)).toThrow();
        });

        it('decrypts empty plaintext', () => {
            const ciphertext = crypto.encrypt('', key);

            expect(crypto.decrypt(ciphertext, key)).toBe('');
        });
    });

    describe('hash', () => {
        it('returns the sha256 hex digest of the input', () => {
            expect(crypto.hash('test')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
        });

        it('is deterministic and input-sensitive', () => {
            expect(crypto.hash('a')).toBe(crypto.hash('a'));
            expect(crypto.hash('a')).not.toBe(crypto.hash('b'));
        });
    });

    describe('randomKey', () => {
        it('returns hex of the requested byte length', () => {
            const key = crypto.randomKey(32);

            expect(key).toMatch(/^[0-9a-f]{64}$/);
        });

        it('produces different keys on successive calls', () => {
            expect(crypto.randomKey(16)).not.toBe(crypto.randomKey(16));
        });
    });

    describe('generateDeterministicBytes', () => {
        const keyHex = crypto.keyFromPassword('pass', 'salt');

        it('keeps PRF derivation cheap, separate from password hardening', () => {
            expect(CryptoEngine.PBKDF2_PRF_ITERATIONS).toBeLessThan(CryptoEngine.PBKDF2_PASSWORD_ITERATIONS);
        });

        it('is deterministic for the same key material and salt', () => {
            const a = crypto.generateDeterministicBytes(keyHex, 'tag', 32);
            const b = crypto.generateDeterministicBytes(keyHex, 'tag', 32);

            expect(a.equals(b)).toBe(true);
        });

        it('returns exactly the requested number of bytes', () => {
            expect(crypto.generateDeterministicBytes(keyHex, 'tag', 16).length).toBe(16);
            expect(crypto.generateDeterministicBytes(keyHex, 'tag', 64).length).toBe(64);
        });

        it('differs when the salt differs', () => {
            const a = crypto.generateDeterministicBytes(keyHex, 'tag_a', 32);
            const b = crypto.generateDeterministicBytes(keyHex, 'tag_b', 32);

            expect(a.equals(b)).toBe(false);
        });

        it('differs when the key material differs', () => {
            const otherKeyHex = crypto.keyFromPassword('pass2', 'salt');
            const a = crypto.generateDeterministicBytes(keyHex, 'tag', 32);
            const b = crypto.generateDeterministicBytes(otherKeyHex, 'tag', 32);

            expect(a.equals(b)).toBe(false);
        });
    });
});
