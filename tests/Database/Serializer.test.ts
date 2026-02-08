import { EntitySerializer } from '@/Database/Serializer';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

describe('EntitySerializer', () => {
    const MockEncounter = createMockEncounterConstructor();
    const serializer = new EntitySerializer(MockEncounter);

    it('constructor extracts column names from entity metadata', () => {
        expect(serializer).toBeInstanceOf(EntitySerializer);
    });

    it('serialize picks only @Column fields', () => {
        const record = {
            uuid: 'u1',
            therapistId: 't1',
            foo: 'ignored',
        };
        const out = serializer.serialize(record as Record<string, unknown>);
        expect(out.uuid).toBe('u1');
        expect(out.therapistId).toBe('t1');
        expect(Object.hasOwn(out, 'foo')).toBe(false);
    });

    it('mergeWithDefaults merges defaults with data (create)', () => {
        const data = { uuid: 'u2', therapistId: 't2' };
        const out = serializer.mergeWithDefaults(data);
        expect(out.uuid).toBe('u2');
        expect(out.therapistId).toBe('t2');
        expect(out.status).toBeDefined();
        expect(out.participantBiocodes).toEqual([]);
    });

    it('mergeWithDefaults merges defaults + stored + data (update)', () => {
        const stored = { uuid: 'u3', therapistId: 'old', totalDuration: 100 };
        const data = { therapistId: 'new' };
        const out = serializer.mergeWithDefaults(data, stored);
        expect(out.uuid).toBe('u3');
        expect(out.therapistId).toBe('new');
        expect(out.totalDuration).toBe(100);
    });

    it('unserialize merges defaults with stored record', () => {
        const stored = { uuid: 'u4', therapistId: 't4' };
        const out = serializer.unserialize(stored);
        expect(out.uuid).toBe('u4');
        expect(out.therapistId).toBe('t4');
        expect(out.status).toBeDefined();
    });

    it('unserializeMap applies unserialize to each value', () => {
        const map = {
            u5: { uuid: 'u5', therapistId: 't5' },
            u6: { uuid: 'u6', therapistId: 't6' },
        };
        const out = serializer.unserializeMap(map);
        expect(out.u5.uuid).toBe('u5');
        expect(out.u6.therapistId).toBe('t6');
    });
});
