/**
 * Therapist behavior tests.
 */

import { Therapist } from '@/Entity/Therapist';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/Service/Logger', () => {
    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
    return {
        AppLogger: {
            getInstance: vi.fn(() => mockLogger),
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
