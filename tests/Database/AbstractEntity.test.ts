/**
 * AbstractEntity tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: AbstractEntity (base entity with plain state, getField/setField, toPlainObject).
 */

import type { AbstractEntity } from '@/Database/AbstractEntity';
import { createNoPkEntityConstructor, createTestEntityConstructor } from '../helpers/mockEntity';

const TestEntity = createTestEntityConstructor();
const NoPkEntity = createNoPkEntityConstructor();

type TestEntityInstance = AbstractEntity & {
    getField: (k: string) => unknown;
    setField: (k: string, v: unknown) => void;
    primaryKey: string;
    toPlainObject: () => Record<string, unknown>;
};

describe('AbstractEntity', () => {
    describe('Z — Zero (missing / empty)', () => {
        it('accessing primaryKey throws when entity has no @PrimaryKey (resolve at use)', () => {
            const e = new NoPkEntity();
            expect(() => (e as TestEntityInstance).primaryKey).toThrow();
        });

        it('constructor with undefined builds state from defaults only', () => {
            const e = new TestEntity(undefined as never) as TestEntityInstance;
            expect(e.getField('id')).toBe('test-primary-key-1');
            expect(e.getField('name')).toBe('');
        });

        it('constructor with empty object merges defaults', () => {
            const e = new TestEntity({}) as TestEntityInstance;
            expect(e.getField('id')).toBe('test-primary-key-1');
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
            expect(e.getField('id')).toBe('test-primary-key-1');
            expect(e.getField('name')).toBe('foo');
        });

        it('primaryKey getter returns primary key value', () => {
            const e = new TestEntity({ id: 'my-id', name: 'n' }) as TestEntityInstance;
            expect(e.primaryKey).toBe('my-id');
        });

        it('toPlainObject returns only column keys with current values', () => {
            const e = new TestEntity({ id: 'r1', name: 'rec' }) as TestEntityInstance;
            const record = e.toPlainObject();
            expect(record.id).toBe('r1');
            expect(record.name).toBe('rec');
            expect(Object.keys(record).sort()).toEqual(['id', 'name']);
        });

        it('property accessors are wired and apply transformers', () => {
            const e = new TestEntity({ name: 'alice' }) as any;
            // getter should read value from internal map
            expect(e.name).toBe('alice');
            e.name = 'bob';
            expect(e.getField('name')).toBe('bob');
        });

        // with the proxy implementation there is no prototype wiring step to
        // observe; all behavior is dynamic.  The earlier version of this test
        // asserted that defineProperty ran only once per class, which no
        // longer makes sense under the proxy.
    });

    describe('B — Boundary', () => {
        it('primaryKey setter updates value', () => {
            const e = new TestEntity({ name: 'n' }) as TestEntityInstance;
            e.primaryKey = 'new-primary-key';
            expect(e.primaryKey).toBe('new-primary-key');
        });

        it('setField then getField reflects update', () => {
            const e = new TestEntity({ name: 'a' }) as TestEntityInstance;
            e.setField('name', 'b');
            expect(e.getField('name')).toBe('b');
        });
    });

    describe('I — Interface (getField / setField)', () => {
        it('getField returns value, setField updates', () => {
            const e = new TestEntity({ name: 'a' }) as TestEntityInstance;
            expect(e.getField('name')).toBe('a');
            e.setField('name', 'b');
            expect(e.getField('name')).toBe('b');
        });
    });

    describe('E — Exceptions', () => {
        it('primaryKey getter throws when no @PrimaryKey (getPrimaryKeyField fails)', () => {
            const e = new NoPkEntity();
            expect(() => (e as TestEntityInstance).primaryKey).toThrow();
        });
    });

    describe('M — Many (multiple columns)', () => {
        it('toPlainObject returns all column keys for entity with multiple fields', () => {
            const e = new TestEntity({ id: 'i1', name: 'n1' }) as TestEntityInstance;
            const plain = e.toPlainObject();
            expect(Object.keys(plain).sort()).toEqual(['id', 'name']);
            expect(plain.id).toBe('i1');
            expect(plain.name).toBe('n1');
        });
    });
});
