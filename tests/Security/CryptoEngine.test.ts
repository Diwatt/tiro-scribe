import { CryptoEngine } from '@/Security/CryptoEngine';

describe('CryptoEngine', () => {
    const crypto = new CryptoEngine();

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
});
