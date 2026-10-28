/**
 * Therapist behavior tests.
 */

import { Therapist } from '@/Entity/Therapist';

describe('Therapist (entity)', () => {
    it('applies defaults on construction', () => {
        const therapist = new Therapist();
        expect(therapist.getUuid()).toHaveLength(36);
        expect(therapist.getBiocode()).toEqual([]);
        expect(therapist.getLanguages()).toEqual([]);
        expect(therapist.getPasswordHash()).toBe('');
        expect(therapist.getYearsOfExperience()).toBeNull();
    });

    it('keeps explicit values over defaults', () => {
        const therapist = new Therapist({ email: 'a@b.c', name: 'House' });
        expect(therapist.getEmail()).toBe('a@b.c');
        expect(therapist.getName()).toBe('House');
    });

    describe('isValidPassword', () => {
        it('returns true when hash matches stored', () => {
            const therapist = new Therapist({});
            const hash = 'a1b2c3d4e5';
            therapist.passwordHash = hash;
            expect(therapist.isValidPassword(hash)).toBe(true);
        });

        it('returns false when hash does not match', () => {
            const therapist = new Therapist({});
            therapist.passwordHash = 'correct_hash';
            expect(therapist.isValidPassword('wrong_hash')).toBe(false);
        });
    });
});
