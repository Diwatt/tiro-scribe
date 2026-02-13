/**
 * AbstractEntity tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: AbstractEntity (base entity with observable state, getField/setField, toRecord).
 */

import type { AbstractEntity } from '@/Database/AbstractEntity';
import { DatabaseException } from '@/Exception';
import { createNoPkEntityConstructor, createTestEntityConstructor } from '../helpers/mockEntity';

const TestEntity = createTestEntityConstructor();
const NoPkEntity = createNoPkEntityConstructor();

type TestEntityInstance = AbstractEntity & {
    getField: (k: string) => unknown;
    setField: (k: string, v: unknown) => void;
    primaryKey: string;
    field$: <T>(k: string) => { get: () => T; set: (v: T) => void };
    toRecord: () => Record<string, unknown>;
};

describe('AbstractEntity', () => {
    describe('Z — Zero (missing / empty)', () => {
        it('throws DatabaseException when entity has no @PrimaryKey', () => {
            expect(() => new NoPkEntity()).toThrow(DatabaseException);
            expect(() => new NoPkEntity()).toThrow(/primary key/);
            try {
                new NoPkEntity();
            } catch (e) {
                expect((e as DatabaseException).code).toBe('PRIMARY_KEY_NOT_DEFINED');
            }
        });

        it('constructor with undefined builds state from defaults only', () => {
            const e = new TestEntity(undefined as never) as TestEntityInstance;
            expect(e.getField('id')).toBe('test-pk-1');
            expect(e.getField('name')).toBe('');
        });

        it('constructor with empty object merges defaults', () => {
            const e = new TestEntity({}) as TestEntityInstance;
            expect(e.getField('id')).toBe('test-pk-1');
            expect(e.getField('name')).toBe('');
        });

        it('getField for missing key returns undefined', () => {
            const e = new TestEntity({ name: 'a' }) as TestEntityInstance;
            expect(e.getField('nonexistent')).toBeUndefined();
        });
    });

    describe('O — One (minimal happy path)', () => {
        it('builds state from plain data with defaults', () => {
            const e = new TestEntity({ name: 'foo' }) as TestEntityInstance;
            expect(e.getField('id')).toBe('test-pk-1');
            expect(e.getField('name')).toBe('foo');
        });

        it('primaryKey getter returns primary key value', () => {
            const e = new TestEntity({ id: 'my-id', name: 'n' }) as TestEntityInstance;
            expect(e.primaryKey).toBe('my-id');
        });

        it('toRecord returns only column keys with current values', () => {
            const e = new TestEntity({ id: 'r1', name: 'rec' }) as TestEntityInstance;
            const record = e.toRecord();
            expect(record.id).toBe('r1');
            expect(record.name).toBe('rec');
            expect(Object.keys(record).sort()).toEqual(['id', 'name']);
        });
    });

    describe('B — Boundary', () => {
        it('primaryKey setter updates value', () => {
            const e = new TestEntity({ name: 'n' }) as TestEntityInstance;
            e.primaryKey = 'new-pk';
            expect(e.primaryKey).toBe('new-pk');
        });

        it('setField then getField reflects update', () => {
            const e = new TestEntity({ name: 'a' }) as TestEntityInstance;
            e.setField('name', 'b');
            expect(e.getField('name')).toBe('b');
        });
    });

    describe('I — Interface (getField / setField / field$)', () => {
        it('getField returns value, setField updates', () => {
            const e = new TestEntity({ name: 'a' }) as TestEntityInstance;
            expect(e.getField('name')).toBe('a');
            e.setField('name', 'b');
            expect(e.getField('name')).toBe('b');
        });

        it('field$ returns object with get/set for the key', () => {
            const e = new TestEntity({ name: 'x' }) as TestEntityInstance;
            const node = e.field$<string>('name');
            expect(node).toBeDefined();
            expect(node.get()).toBe('x');
            node.set('y');
            expect(e.getField('name')).toBe('y');
        });
    });

    describe('E — Exceptions', () => {
        it('constructor throws with code PRIMARY_KEY_NOT_DEFINED when no @PrimaryKey', () => {
            try {
                new NoPkEntity();
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('PRIMARY_KEY_NOT_DEFINED');
            }
        });
    });
});
