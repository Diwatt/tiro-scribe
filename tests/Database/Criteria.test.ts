import { Criteria } from '@/Database/Criteria';
import { DatabaseException } from '@/Exception';

describe('Criteria', () => {
    describe('of()', () => {
        it('allows scalar values including null and undefined', () => {
            const c = Criteria.of({ a: 1, b: 'x', c: true, d: null, e: undefined });
            expect(c.value()).toEqual({ a: 1, b: 'x', c: true, d: null, e: undefined });
        });

        it('throws when a value is an object', () => {
            expect(() => Criteria.of({ foo: { nested: 1 } })).toThrow(DatabaseException);
        });

        it('throws when a value is an array', () => {
            expect(() => Criteria.of({ tags: ['a'] })).toThrow(DatabaseException);
        });
    });

    describe('validate()', () => {
        const allowed = new Set(['a', 'b', 'c']);

        it('does not throw when all keys are allowed', () => {
            const c = Criteria.of({ a: 1, b: 'x' });
            expect(() => c.validate(allowed)).not.toThrow();
        });

        it('throws DatabaseException when a key is not allowed', () => {
            const c = Criteria.of({ foo: 1 });
            expect(() => c.validate(allowed)).toThrow(DatabaseException);
            expect(() => c.validate(allowed)).toThrow(/not an entity property name/);
        });
    });

    describe('validateOrderBy()', () => {
        const allowed = new Set(['foo', 'bar']);

        it('does not throw when all order by columns are allowed', () => {
            expect(() =>
                Criteria.validateOrderBy(
                    [
                        { column: 'foo' },
                        { column: 'bar' },
                    ],
                    allowed,
                ),
            ).not.toThrow();
        });

        it('throws when any order by column is not allowed', () => {
            expect(() =>
                Criteria.validateOrderBy([{ column: 'baz' }], allowed),
            ).toThrow(DatabaseException);
        });
    });

    describe('internals', () => {
        it('isScalar returns true for null/undefined/string/number/boolean and false otherwise', () => {
            // @ts-expect-error accessing private
            const isScalar = (Criteria as any).isScalar as (v: unknown) => boolean;
            expect(isScalar(null)).toBe(true);
            expect(isScalar(undefined)).toBe(true);
            expect(isScalar('x')).toBe(true);
            expect(isScalar(123)).toBe(true);
            expect(isScalar(false)).toBe(true);
            expect(isScalar({})).toBe(false);
            expect(isScalar([])).toBe(false);
            expect(isScalar(() => {})).toBe(false);
        });

        it('requireNamesInAllowlist throws with descriptive message including allowed list', () => {
            // @ts-expect-error accessing private
            const fn = (Criteria as any).requireNamesInAllowlist as (
                names: Iterable<string>,
                allowedKeys: ReadonlySet<string>,
                options: { code: string; label: string; contextKey: string },
            ) => void;
            const allowedKeys = new Set(['x', 'y']);
            expect(() => fn(['z'], allowedKeys, { code: 'C', label: 'Label', contextKey: 'k' })).toThrow(DatabaseException);
            expect(() => fn(['z'], allowedKeys, { code: 'C', label: 'Label', contextKey: 'k' })).toThrow(/Label "z" is not an entity property name/);
        });
    });
});