import { VaultKeyDerivation } from '@/Security/VaultKeyDerivation';

describe('VaultKeyDerivation', () => {
    describe('buildSalt', () => {
        it('returns tag-prefixed string with uuid', () => {
            expect(VaultKeyDerivation.buildSalt('uuid-1', 'vault_primary')).toBe('scribe_vault_primary_uuid-1');
        });

        it('uses different tags', () => {
            expect(VaultKeyDerivation.buildSalt('u', 'tag_a')).toBe('scribe_tag_a_u');
        });
    });

    describe('deriveKeyFromPassword', () => {
        it('returns WordArray of fixed key size', () => {
            const key = VaultKeyDerivation.deriveKeyFromPassword('password', 'salt');
            expect(key).toBeDefined();
            expect(key.words).toBeDefined();
            expect(Array.isArray(key.words)).toBe(true);
        });

        it('same password and salt produce same key', () => {
            const a = VaultKeyDerivation.deriveKeyFromPassword('p', 's');
            const b = VaultKeyDerivation.deriveKeyFromPassword('p', 's');
            expect(a.toString()).toBe(b.toString());
        });

        it('different salt produces different key', () => {
            const a = VaultKeyDerivation.deriveKeyFromPassword('p', 's1');
            const b = VaultKeyDerivation.deriveKeyFromPassword('p', 's2');
            expect(a.toString()).not.toBe(b.toString());
        });
    });

    describe('deriveKeyFromRecoveryCode', () => {
        it('returns WordArray', () => {
            const key = VaultKeyDerivation.deriveKeyFromRecoveryCode('ABCD-1234-EFGH');
            expect(key).toBeDefined();
            expect(key.words).toBeDefined();
        });

        it('same recovery code produces same key', () => {
            const a = VaultKeyDerivation.deriveKeyFromRecoveryCode('CODE-1234-5678');
            const b = VaultKeyDerivation.deriveKeyFromRecoveryCode('CODE-1234-5678');
            expect(a.toString()).toBe(b.toString());
        });
    });

    describe('generateRecoveryCode', () => {
        it('returns string with two hyphens (three parts)', () => {
            const code = VaultKeyDerivation.generateRecoveryCode();
            expect(typeof code).toBe('string');
            const parts = code.split('-');
            expect(parts).toHaveLength(3);
        });

        it('each part has length 4', () => {
            const code = VaultKeyDerivation.generateRecoveryCode();
            const parts = code.split('-');
            parts.forEach((p) => expect(p).toHaveLength(4));
        });

        it('uses only allowed characters (no I, L, O, 0, 1)', () => {
            const allowed = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
            const code = VaultKeyDerivation.generateRecoveryCode();
            const chars = code.replace(/-/g, '').split('');
            chars.forEach((c) => expect(allowed.has(c)).toBe(true));
        });
    });
});
