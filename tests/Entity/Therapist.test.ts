/**
 * Therapist behavior tests.
 */

import { Therapist } from '@/Entity/Therapist';

jest.mock('@/Core/AppLogger', () => {
    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return {
        AppLogger: {
            getInstance: jest.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

describe('Therapist', () => {
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
