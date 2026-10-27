import { SchemaValidator } from '@/Decorator/SchemaValidator';
import type { OptionsSchema } from '@/Decorator/Type';
import { DatabaseException, DecoratorException, MULTIPLE_DECORATORS_NOT_SUPPORTED } from '@/Exception';

describe('SchemaValidator', () => {
    const validator = new SchemaValidator();

    describe('validate', () => {
        it('does not throw when options satisfy schema', () => {
            const schema: OptionsSchema = {
                table_name: { required: true, type: 'string' },
            };
            expect(() => validator.validate({ table_name: 'users' }, schema, 'ERR')).not.toThrow();
        });

        it('throws DatabaseException when required option is missing', () => {
            const schema: OptionsSchema = {
                table_name: { required: true, type: 'string' },
            };
            expect(() => validator.validate({}, schema, 'INVALID_ENTITY')).toThrow(DatabaseException);
            expect(() => validator.validate({}, schema, 'INVALID_ENTITY')).toThrow(/Option "table_name" is required/);
        });

        it('throws DatabaseException when type does not match (string)', () => {
            const schema: OptionsSchema = { name: { required: false, type: 'string' } };
            expect(() => validator.validate({ name: 42 }, schema, 'ERR')).toThrow(DatabaseException);
            expect(() => validator.validate({ name: 42 }, schema, 'ERR')).toThrow(/must be of type string/);
        });

        it('throws DatabaseException when type does not match (number)', () => {
            const schema: OptionsSchema = { count: { required: false, type: 'number' } };
            expect(() => validator.validate({ count: 'x' }, schema, 'ERR')).toThrow(DatabaseException);
        });

        it('allows value when type matches one of composition', () => {
            const schema: OptionsSchema = { default: { required: true, type: ['string', 'function'] } };
            expect(() => validator.validate({ default: 'x' }, schema, 'ERR')).not.toThrow();
            expect(() => validator.validate({ default: () => 'x' }, schema, 'ERR')).not.toThrow();
        });

        it('throws when value type not in composition', () => {
            const schema: OptionsSchema = { default: { required: true, type: ['string'] } };
            expect(() => validator.validate({ default: 123 }, schema, 'ERR')).toThrow(DatabaseException);
        });

        it('does not validate type when option not set (optional)', () => {
            const schema: OptionsSchema = { optional: { required: false, type: 'string' } };
            expect(() => validator.validate({}, schema, 'ERR')).not.toThrow();
        });

        it('throws DatabaseException with the enum message when value is outside the enum', () => {
            const schema: OptionsSchema = { mode: { enum: ['standard', 'incognito'] } };
            expect(() => validator.validate({ mode: 'chaos' }, schema, 'ERR')).toThrow(DatabaseException);
            expect(() => validator.validate({ mode: 'chaos' }, schema, 'ERR')).toThrow(
                /Option "mode" must be one of \[standard, incognito\]/,
            );
        });

        it('carries the errorCode when enum validation fails', () => {
            const schema: OptionsSchema = { mode: { enum: ['standard'] } };
            let captured: unknown;
            try {
                validator.validate({ mode: 'chaos' }, schema, 'INVALID_MODE');
            } catch (error) {
                captured = error;
            }
            expect(captured).toBeInstanceOf(DatabaseException);
            expect((captured as DatabaseException).code).toBe('INVALID_MODE');
        });

        it('throws when enum is set and value is not a string', () => {
            const schema: OptionsSchema = { mode: { enum: ['standard', 'incognito'] } };
            expect(() => validator.validate({ mode: 42 }, schema, 'ERR')).toThrow(DatabaseException);
        });

        it('accepts a value inside the enum and skips the type check', () => {
            const schema: OptionsSchema = { mode: { enum: ['standard'], type: 'number' } };
            expect(() => validator.validate({ mode: 'standard' }, schema, 'ERR')).not.toThrow();
        });

        it('throws DatabaseException with the blank message when notBlank string is only whitespace', () => {
            const schema: OptionsSchema = { name: { notBlank: true } };
            expect(() => validator.validate({ name: '   ' }, schema, 'ERR')).toThrow(DatabaseException);
            expect(() => validator.validate({ name: '   ' }, schema, 'ERR')).toThrow(/Option "name" must not be blank/);
        });

        it('accepts a non-blank string when notBlank is true', () => {
            const schema: OptionsSchema = { name: { notBlank: true } };
            expect(() => validator.validate({ name: 'a' }, schema, 'ERR')).not.toThrow();
        });

        it('ignores notBlank for non-string values', () => {
            const schema: OptionsSchema = { count: { notBlank: true } };
            expect(() => validator.validate({ count: 0 }, schema, 'ERR')).not.toThrow();
        });

        it('throws DatabaseException with the integer message when integer is required and value has a fraction', () => {
            const schema: OptionsSchema = { count: { integer: true } };
            expect(() => validator.validate({ count: 1.5 }, schema, 'ERR')).toThrow(DatabaseException);
            expect(() => validator.validate({ count: 1.5 }, schema, 'ERR')).toThrow(/Option "count" must be an integer/);
        });

        it('accepts a whole number when integer is required', () => {
            const schema: OptionsSchema = { count: { integer: true } };
            expect(() => validator.validate({ count: 2 }, schema, 'ERR')).not.toThrow();
        });

        it('throws DatabaseException with the min message when number is below the min constraint', () => {
            const schema: OptionsSchema = { count: { min: 5 } };
            expect(() => validator.validate({ count: 4 }, schema, 'ERR')).toThrow(DatabaseException);
            expect(() => validator.validate({ count: 4 }, schema, 'ERR')).toThrow(/Option "count" must be >= 5/);
        });

        it('accepts a number equal to the min constraint', () => {
            const schema: OptionsSchema = { count: { min: 5 } };
            expect(() => validator.validate({ count: 5 }, schema, 'ERR')).not.toThrow();
        });

        it('accepts an object value when type allows object', () => {
            const schema: OptionsSchema = { filter: { type: 'object' } };
            expect(() => validator.validate({ filter: { op: 'eq' } }, schema, 'ERR')).not.toThrow();
        });
    });

    describe('ensurePropertyDecoratorUniqueness', () => {
        it('does nothing when meta is null or not object', () => {
            expect(() => validator.ensurePropertyDecoratorUniqueness(null, 'id', 'PrimaryKey')).not.toThrow();
            expect(() => validator.ensurePropertyDecoratorUniqueness(undefined, 'id', 'PrimaryKey')).not.toThrow();
        });

        it('does not throw when no other property has same decorator', () => {
            const meta: Record<string, { decorators?: Array<{ decoratorName: string }> }> = {
                uuid: { decorators: [{ decoratorName: 'Column' }] },
            };
            expect(() => validator.ensurePropertyDecoratorUniqueness(meta, 'id', 'PrimaryKey')).not.toThrow();
        });

        const conflictMeta: Record<string, { decorators?: Array<{ decoratorName: string }> }> = {
            id: { decorators: [{ decoratorName: 'PrimaryKey' }] },
            uuid: { decorators: [{ decoratorName: 'Column' }] },
        };

        const captureConflict = (): unknown => {
            try {
                validator.ensurePropertyDecoratorUniqueness(conflictMeta, 'uuid', 'PrimaryKey');
            } catch (error) {
                return error;
            }
            return undefined;
        };

        it('throws DecoratorException when another property has same decorator', () => {
            expect(captureConflict()).toBeInstanceOf(DecoratorException);
        });

        it('mentions the conflicting property in the error message', () => {
            const error = captureConflict() as DecoratorException;

            expect(error).toBeInstanceOf(DecoratorException);
            expect(error.message).toMatch(/already on "id"/);
        });

        it('carries the MULTIPLE_DECORATORS_NOT_SUPPORTED code', () => {
            const error = captureConflict() as DecoratorException;

            expect(error).toBeInstanceOf(DecoratorException);
            expect(error.code).toBe(MULTIPLE_DECORATORS_NOT_SUPPORTED);
        });

        it('does not throw when same property has the decorator (current property skipped)', () => {
            const meta: Record<string, { decorators?: Array<{ decoratorName: string }> }> = {
                id: { decorators: [{ decoratorName: 'PrimaryKey' }] },
            };
            expect(() => validator.ensurePropertyDecoratorUniqueness(meta, 'id', 'PrimaryKey')).not.toThrow();
        });
    });
});
