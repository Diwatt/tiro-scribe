import { RecoveryCode } from '@/Security/RecoveryCode';

describe('RecoveryCode', () => {
    const recovery = new RecoveryCode();

    describe('isValidCode', () => {
        it('accepts a canonical code', () => {
            expect(RecoveryCode.isValidCode('ABCD-EFGH-JKLM')).toBe(true);
        });

        it('accepts loose input (case and separators ignored)', () => {
            expect(RecoveryCode.isValidCode('abcd efgh jklm')).toBe(true);
        });

        it('rejects a truncated code', () => {
            expect(RecoveryCode.isValidCode('ABCD-EFGH')).toBe(false);
        });

        it('rejects a code with too many characters', () => {
            expect(RecoveryCode.isValidCode('ABCD-EFGH-JKLM-NPQR')).toBe(false);
        });

        it('rejects characters outside the kit alphabet', () => {
            expect(RecoveryCode.isValidCode('ABCD-EFG0-JKLM')).toBe(false);
            expect(RecoveryCode.isValidCode('ABCD-EFGI-JKLM')).toBe(false);
        });
    });

    describe('canonicalize', () => {
        it('uppercases and regroups in blocks of four', () => {
            expect(RecoveryCode.canonicalize('abcd efgh jklm')).toBe('ABCD-EFGH-JKLM');
        });

        it('keeps an already canonical code untouched', () => {
            expect(RecoveryCode.canonicalize('ABCD-EFGH-JKLM')).toBe('ABCD-EFGH-JKLM');
        });
    });

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

        it('different recovery codes with same salt produce different keys', () => {
            const a = recovery.keyFromCode('CODE-1234-5678', salt);
            const b = recovery.keyFromCode('WXYZ-9876-5432', salt);
            expect(a).not.toBe(b);
        });

        it('same recovery code with different salts produces different keys', () => {
            const a = recovery.keyFromCode('CODE-1234-5678', salt);
            const b = recovery.keyFromCode('CODE-1234-5678', 'therapist-uuid-456');
            expect(a).not.toBe(b);
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

        it('uses only allowed characters (no I, O, 0, 1)', () => {
            const allowed = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
            const code = recovery.create();
            const chars = code.replace(/-/g, '').split('');
            chars.forEach((c) => {
                expect(allowed.has(c)).toBe(true);
            });
        });
    });
});
