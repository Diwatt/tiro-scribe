import { z } from 'zod';
import { RestoreSchema, type RestoreFormData } from '@/State/Start';

const parse = (data: Partial<RestoreFormData>): z.ZodSafeParseResult<RestoreFormData> =>
    RestoreSchema.form.safeParse({ ...RestoreSchema.defaults, ...data });

const VALID_PASSWORD = 'longenough';

describe('RestoreSchema', () => {
    describe('recovery code', () => {
        it('accepts a canonical code', () => {
            expect(
                parse({ recoveryCode: 'ABCD-EFGH-JKLM', newPassword: VALID_PASSWORD, confirmPassword: VALID_PASSWORD })
                    .success,
            ).toBe(true);
        });

        it('accepts a lowercase code with mixed separators', () => {
            expect(
                parse({ recoveryCode: 'abcd efgh jklm', newPassword: VALID_PASSWORD, confirmPassword: VALID_PASSWORD })
                    .success,
            ).toBe(true);
        });

        it('rejects excluded characters (0, 1, I, O)', () => {
            expect(parse({ recoveryCode: 'ABCD-EFG0-JKLM' }).success).toBe(false);
            expect(parse({ recoveryCode: 'ABCD-EFG1-JKLM' }).success).toBe(false);
            expect(parse({ recoveryCode: 'ABCD-EFGI-JKLM' }).success).toBe(false);
            expect(parse({ recoveryCode: 'ABCD-EFGO-JKLM' }).success).toBe(false);
        });

        it('rejects a code with too many groups', () => {
            expect(parse({ recoveryCode: 'ABCD-EFGH-JKLM-NPQR' }).success).toBe(false);
        });

        it('rejects a truncated code', () => {
            expect(parse({ recoveryCode: 'ABCD-EFGH' }).success).toBe(false);
        });
    });

    describe('new password', () => {
        it('rejects a password below 8 characters', () => {
            expect(parse({ recoveryCode: 'ABCD-EFGH-JKLM', newPassword: 'short' }).success).toBe(false);
        });

        it('rejects a mismatching confirmation', () => {
            expect(
                parse({ recoveryCode: 'ABCD-EFGH-JKLM', newPassword: 'longenough', confirmPassword: 'different' })
                    .success,
            ).toBe(false);
        });
    });

    describe('defaults', () => {
        it('are an empty valid-shape form', () => {
            expect(RestoreSchema.defaults).toEqual({ recoveryCode: '', newPassword: '', confirmPassword: '' });
        });
    });
});
