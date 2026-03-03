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

        it('throws DecoratorException when another property has same decorator', () => {
            const meta: Record<string, { decorators?: Array<{ decoratorName: string }> }> = {
                id: { decorators: [{ decoratorName: 'PrimaryKey' }] },
                uuid: { decorators: [{ decoratorName: 'Column' }] },
            };
            expect(() => validator.ensurePropertyDecoratorUniqueness(meta, 'uuid', 'PrimaryKey')).toThrow(DecoratorException);
            expect(() => validator.ensurePropertyDecoratorUniqueness(meta, 'uuid', 'PrimaryKey')).toThrow(/already on \"id\"/);
            try {
                validator.ensurePropertyDecoratorUniqueness(meta, 'uuid', 'PrimaryKey');
            } catch (e) {
                expect((e as DecoratorException).code).toBe(MULTIPLE_DECORATORS_NOT_SUPPORTED);
            }
        });

        it('does not throw when same property has the decorator (current property skipped)', () => {
            const meta: Record<string, { decorators?: Array<{ decoratorName: string }> }> = {
                id: { decorators: [{ decoratorName: 'PrimaryKey' }] },
            };
            expect(() => validator.ensurePropertyDecoratorUniqueness(meta, 'id', 'PrimaryKey')).not.toThrow();
        });
    });
});
