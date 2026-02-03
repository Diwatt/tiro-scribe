/**
 * Encounter behavior tests using mock entity (real Encounter uses Stage 3 decorators
 * and cannot be loaded in Jest without decorator config). Repository/AbstractEntity
 * tests cover persist/find with encounter-like entities.
 */

import { createMockEncounterConstructor } from '../helpers/mockEntity';
import { AbstractEntity } from '@/Database/AbstractEntity';

describe('Encounter (via mock)', () => {
    const MockEncounter = createMockEncounterConstructor();

    it('constructs with therapistId and applies defaults', () => {
        const enc = new MockEncounter({ therapistId: 't1' }) as AbstractEntity & {
            getField: (k: string) => unknown;
        };
        expect(enc.getField('therapistId')).toBe('t1');
        expect(enc.getField('uuid')).toBeDefined();
        expect(enc.getField('status')).toBe('recording');
        expect(enc.getField('participantBiocodes')).toEqual([]);
    });
});
