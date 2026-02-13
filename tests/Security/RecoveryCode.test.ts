import { RecoveryCode } from '@/Security/RecoveryCode';

describe('RecoveryCode', () => {
    const recovery = new RecoveryCode();

    describe('keyFromCode', () => {
        const salt = 'therapist-uuid-123';

        it('returns hex string', () => {
            const key = recovery.keyFromCode('ABCD-1234-EFGH', salt);
            expect(typeof key).toBe('string');
            expect(key).toMatch(/^[0-9a-f]+$/);
        });

        it('same recovery code and salt produces same key', () => {
            const a = recovery.keyFromCode('CODE-1234-5678', salt);
            const b = recovery.keyFromCode('CODE-1234-5678', salt);
            expect(a).toBe(b);
        });
    });

    describe('create', () => {
        it('returns string with two hyphens (three parts)', () => {
            const code = recovery.create();
            expect(typeof code).toBe('string');
            const parts = code.split('-');
            expect(parts).toHaveLength(3);
        });

        it('each part has length 4', () => {
            const code = recovery.create();
            const parts = code.split('-');
            parts.forEach((p) => {
                expect(p).toHaveLength(4);
            });
        });

        it('uses only allowed characters (no I, L, O, 0, 1)', () => {
            const allowed = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
            const code = recovery.create();
            const chars = code.replace(/-/g, '').split('');
            chars.forEach((c) => {
                expect(allowed.has(c)).toBe(true);
            });
        });
    });
});
