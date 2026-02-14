/**
 * RecordNormalizer tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: RecordNormalizer (forWrite, fromStorage, fromStorageMap).
 */

import { EntityMetadata } from '@/Database/Decorator';
import { RecordNormalizer } from '@/Database/RecordNormalizer';
import type { MetadataConstructor } from '@/Decorator/Type';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

describe('RecordNormalizer', () => {
    const MockEncounter = createMockEncounterConstructor();
    const metadata = EntityMetadata.for(MockEncounter as MetadataConstructor);
    const normalizer = new RecordNormalizer(metadata);

    describe('Z — Zero (empty / minimal)', () => {
        it('forWrite with empty object returns empty record (no keys to pick)', () => {
            const out = normalizer.forWrite({});
            expect(out).toEqual({});
        });

        it('fromStorage with empty object returns defaults', () => {
            const out = normalizer.fromStorage({});
            expect(out.status).toBeDefined();
            expect(out.participantBiocodes).toEqual([]);
        });

        it('fromStorageMap with empty map returns empty object', () => {
            const out = normalizer.fromStorageMap({});
            expect(out).toEqual({});
        });
    });

    describe('O — One (single item)', () => {
        it('constructor accepts metadata', () => {
            expect(normalizer).toBeInstanceOf(RecordNormalizer);
        });

        it('forWrite picks only @Column fields', () => {
            const record = {
                uuid: 'u1',
                therapistId: 't1',
                foo: 'ignored',
            };
            const out = normalizer.forWrite(record as Record<string, unknown>);
            expect(out.uuid).toBe('u1');
            expect(out.therapistId).toBe('t1');
            expect(Object.hasOwn(out, 'foo')).toBe(false);
        });

        it('fromStorage merges defaults with stored record', () => {
            const stored = { uuid: 'u4', therapistId: 't4' };
            const out = normalizer.fromStorage(stored);
            expect(out.uuid).toBe('u4');
            expect(out.therapistId).toBe('t4');
            expect(out.status).toBeDefined();
        });
    });

    describe('B — Boundary', () => {
        it('forWrite with record containing only one column returns single key', () => {
            const record = { uuid: 'only-uuid' };
            const out = normalizer.forWrite(record as Record<string, unknown>);
            expect(Object.keys(out)).toEqual(['uuid']);
            expect(out.uuid).toBe('only-uuid');
        });
    });

    describe('M — Many (collections)', () => {
        it('fromStorageMap applies fromStorage to each value', () => {
            const map = {
                u5: { uuid: 'u5', therapistId: 't5' },
                u6: { uuid: 'u6', therapistId: 't6' },
            };
            const out = normalizer.fromStorageMap(map);
            expect(out.u5.uuid).toBe('u5');
            expect(out.u6.therapistId).toBe('t6');
        });
    });

    describe('I — Interface (contract)', () => {
        it('forWrite returns only column keys present in record (drops non-column keys)', () => {
            const record = { uuid: 'u', therapistId: 't', extra: 1 };
            const out = normalizer.forWrite(record as Record<string, unknown>);
            const keys = Object.keys(out).sort();
            expect(keys).toEqual(['therapistId', 'uuid']);
            expect(Object.hasOwn(out, 'extra')).toBe(false);
        });
    });

    describe('E — Exceptions (resilience)', () => {
        it('fromStorage with stored record containing null values merges without throwing', () => {
            const stored = { uuid: 'u', therapistId: null, status: null };
            const out = normalizer.fromStorage(stored as Record<string, unknown>);
            expect(out.uuid).toBe('u');
            expect(out.therapistId).toBeNull();
            expect(out.status).toBeNull();
        });
    });
});
