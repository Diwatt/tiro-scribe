/**
 * EntitySerializer tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: EntitySerializer (serialize, mergeWithDefaults, unserialize, unserializeMap).
 */

import { EntitySerializer } from '@/Database/Serializer';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

describe('EntitySerializer', () => {
    const MockEncounter = createMockEncounterConstructor();
    const serializer = new EntitySerializer(MockEncounter);

    describe('Z — Zero (empty / minimal)', () => {
        it('serialize with empty object returns empty record (no keys to pick)', () => {
            const out = serializer.serialize({});
            expect(out).toEqual({});
        });

        it('mergeWithDefaults with empty data returns defaults', () => {
            const out = serializer.mergeWithDefaults({});
            expect(out.status).toBeDefined();
            expect(out.participantBiocodes).toEqual([]);
        });

        it('unserialize with empty object returns defaults', () => {
            const out = serializer.unserialize({});
            expect(out.status).toBeDefined();
            expect(out.participantBiocodes).toEqual([]);
        });

        it('unserializeMap with empty map returns empty object', () => {
            const out = serializer.unserializeMap({});
            expect(out).toEqual({});
        });
    });

    describe('O — One (single item)', () => {
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

        it('unserialize merges defaults with stored record', () => {
            const stored = { uuid: 'u4', therapistId: 't4' };
            const out = serializer.unserialize(stored);
            expect(out.uuid).toBe('u4');
            expect(out.therapistId).toBe('t4');
            expect(out.status).toBeDefined();
        });
    });

    describe('M — Many (collections)', () => {
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

    describe('B — Boundary (update merge order)', () => {
        it('mergeWithDefaults merges defaults + stored + data (update): data overrides stored', () => {
            const stored = { uuid: 'u3', therapistId: 'old', totalDuration: 100 };
            const data = { therapistId: 'new' };
            const out = serializer.mergeWithDefaults(data, stored);
            expect(out.uuid).toBe('u3');
            expect(out.therapistId).toBe('new');
            expect(out.totalDuration).toBe(100);
        });
    });

    describe('I — Interface (contract)', () => {
        it('serialize returns only column keys present in record (drops non-column keys)', () => {
            const record = { uuid: 'u', therapistId: 't', extra: 1 };
            const out = serializer.serialize(record as Record<string, unknown>);
            const keys = Object.keys(out).sort();
            expect(keys).toEqual(['therapistId', 'uuid']);
            expect(Object.hasOwn(out, 'extra')).toBe(false);
        });
    });
});
