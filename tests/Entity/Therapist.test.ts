/**
 * Therapist behavior tests.
 */

import { Therapist } from '@/Entity/Therapist';

describe('Therapist', () => {
    describe('isValidPassword', () => {
        it('returns true when hash matches stored', () => {
            const therapist = new Therapist({});
            const hash = 'a1b2c3d4e5';
            therapist.setPasswordHash(hash);
            expect(therapist.isValidPassword(hash)).toBe(true);
        });

        it('returns false when hash does not match', () => {
            const therapist = new Therapist({});
            therapist.setPasswordHash('correct_hash');
            expect(therapist.isValidPassword('wrong_hash')).toBe(false);
        });
    });
});
