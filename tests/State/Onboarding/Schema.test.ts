import { Schema } from '@/State/Onboarding/Schema';

describe('Onboarding Schema', () => {
    const vault = {
        ...Schema.defaults,
        languages: ['fr'],
        email: 'practice@example.org',
        password: 'long-enough-passphrase',
        confirmPassword: 'long-enough-passphrase',
    };

    it('accepts the vault step without practice profile fields', () => {
        expect(Schema.form.safeParse(vault).success).toBe(true);
    });

    it('rejects mismatching passwords', () => {
        const result = Schema.form.safeParse({ ...vault, confirmPassword: 'something-else' });
        expect(result.success).toBe(false);
    });

    it('rejects an empty language list', () => {
        expect(Schema.form.safeParse({ ...vault, languages: [] }).success).toBe(false);
    });

    it('still rejects a non numeric experience when one is given', () => {
        expect(Schema.form.safeParse({ ...vault, experience: 'eight' }).success).toBe(false);
    });
});
