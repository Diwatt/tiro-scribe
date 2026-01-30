import { AbstractEntity } from '@/Database/AbstractEntity';
import { DatabaseException } from '@/Exception';
import {
    createTestEntityConstructor,
    createNoPkEntityConstructor,
} from '../helpers/mockEntity';

const TestEntity = createTestEntityConstructor();
const NoPkEntity = createNoPkEntityConstructor();

describe('AbstractEntity', () => {
    describe('constructor', () => {
        it('throws when entity has no @PrimaryKey', () => {
            expect(() => new NoPkEntity()).toThrow(DatabaseException);
            expect(() => new NoPkEntity()).toThrow(/primary key/);
            try {
                new NoPkEntity();
            } catch (e) {
                expect((e as DatabaseException).code).toBe('PRIMARY_KEY_NOT_DEFINED');
            }
        });

        it('builds state from plain data with defaults', () => {
            const e = new TestEntity({ name: 'foo' }) as AbstractEntity & {
                getField: (k: string) => unknown;
                setField: (k: string, v: unknown) => void;
            };
            expect(e.getField('id')).toBe('test-pk-1');
            expect(e.getField('name')).toBe('foo');
        });

        it('primaryKey getter returns primary key value', () => {
            const e = new TestEntity({ id: 'my-id', name: 'n' }) as AbstractEntity & {
                primaryKey: string;
            };
            expect(e.primaryKey).toBe('my-id');
        });

        it('primaryKey setter updates value', () => {
            const e = new TestEntity({ name: 'n' }) as AbstractEntity & {
                primaryKey: string;
            };
            e.primaryKey = 'new-pk';
            expect(e.primaryKey).toBe('new-pk');
        });
    });

    describe('getField / setField', () => {
        it('getField returns value, setField updates', () => {
            const e = new TestEntity({ name: 'a' }) as AbstractEntity & {
                getField: (k: string) => unknown;
                setField: (k: string, v: unknown) => void;
            };
            expect(e.getField('name')).toBe('a');
            e.setField('name', 'b');
            expect(e.getField('name')).toBe('b');
        });
    });

    describe('field$', () => {
        it('field$ returns object with get/set for the key', () => {
            const e = new TestEntity({ name: 'x' }) as AbstractEntity & {
                field$: <T>(k: string) => { get: () => T; set: (v: T) => void };
                getField: (k: string) => unknown;
            };
            const node = e.field$<string>('name');
            expect(node).toBeDefined();
            expect(node.get()).toBe('x');
            node.set('y');
            expect(e.getField('name')).toBe('y');
        });
    });
});
