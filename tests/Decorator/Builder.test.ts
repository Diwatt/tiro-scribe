// Set global __DEV__ variable for tests
// @ts-expect-error allow setting global for test
global.__DEV__ = true;

import { vi } from 'vitest';
import { Builder } from '@/Decorator/Builder';
import type { ClassDecoratorConfig, PropertyDecoratorConfig, OptionsSchema } from '@/Decorator/Type';
import { DatabaseException } from '@/Exception/DatabaseException';

describe('Builder', () => {
    describe('buildEntity', () => {
        it('returns a function that returns a decorator', () => {
            const config: ClassDecoratorConfig<object> = {
                decorate: vi.fn(),
            };
            const decoratorFactory = Builder.buildEntity(config);
            expect(typeof decoratorFactory).toBe('function');
            const decorator = decoratorFactory();
            expect(typeof decorator).toBe('function');
        });

        it('defaults options to {} when not provided', () => {
            const decorate = vi.fn();
            const config: ClassDecoratorConfig<object> = { decorate };
            const decorator = Builder.buildEntity(config)();
            class TestEntity {}
            const target = TestEntity;
            const context = {} as ClassDecoratorContext<typeof target>;
            decorator(target, context);
            expect(decorate).toHaveBeenCalledWith(target, context, {});
        });

        it('passes options to decorate', () => {
            const decorate = vi.fn();
            const config: ClassDecoratorConfig<{ table_name: string }> = { decorate };
            const decorator = Builder.buildEntity(config)({ table_name: 'tests' });
            class TestEntity {}
            const target = TestEntity;
            const context = {} as ClassDecoratorContext<typeof target>;
            decorator(target, context);
            expect(decorate).toHaveBeenCalledWith(target, context, { table_name: 'tests' });
        });

        it('returns target from decorator', () => {
            const config: ClassDecoratorConfig<object> = { decorate: vi.fn() };
            const decorator = Builder.buildEntity(config)();
            class T {}
            const target = T;
            const result = decorator(target, {} as ClassDecoratorContext<typeof target>);
            expect(result).toBe(target);
        });

        it('validates options against schema when schema and errorCode set', () => {
            const schema: OptionsSchema = { table_name: { required: true, type: 'string' } };
            const config: ClassDecoratorConfig<object> = {
                schema,
                errorCode: 'INVALID_ENTITY',
                decorate: vi.fn(),
            };
            expect(() => Builder.buildEntity(config)()).toThrow(DatabaseException);
            expect(() => {
                const decorator = Builder.buildEntity(config)({ table_name: 'ok' });
                class TestEntity {}
                decorator(TestEntity, {} as never);
            }).not.toThrow();
        });

        it('calls custom validate when provided', () => {
            const validate = vi.fn();
            const config: ClassDecoratorConfig<object> = { decorate: vi.fn(), validate };
            const decorator = Builder.buildEntity(config)({ x: 1 });
            class T {}
            decorator(T, {} as never);
            expect(validate).toHaveBeenCalledWith({ x: 1 });
        });
    });

    describe('buildField', () => {
        it('returns a function that returns a field decorator', () => {
            const config: PropertyDecoratorConfig<object> = {
                initializer: vi.fn(() => () => {}),
            };
            const decoratorFactory = Builder.buildField(config);
            expect(typeof decoratorFactory).toBe('function');
            const decorator = decoratorFactory();
            expect(typeof decorator).toBe('function');
        });

        it('defaults options to {}', () => {
            const initializer = vi.fn(() => () => {});
            const config: PropertyDecoratorConfig<object> = { initializer };
            const decorator = Builder.buildField(config)();
            const context = {
                name: 'uuid',
                metadata: {},
                addInitializer: vi.fn((cb: () => void) => cb()),
            } as unknown as ClassFieldDecoratorContext<unknown, unknown>;
            decorator(undefined, context);
            expect(initializer).toHaveBeenCalledWith(context, {});
        });

        it('passes options to before and initializer', () => {
            const before = vi.fn();
            const initializer = vi.fn(() => () => {});
            const config: PropertyDecoratorConfig<{ default: number }> = {
                before,
                initializer,
            };
            const decorator = Builder.buildField(config)({ default: 42 });
            const context = {
                name: 'x',
                metadata: {},
                addInitializer: vi.fn((cb: () => void) => cb()),
            } as unknown as ClassFieldDecoratorContext<unknown, unknown>;
            decorator(undefined, context);
            expect(before).toHaveBeenCalledWith(context, { default: 42 });
            expect(initializer).toHaveBeenCalledWith(context, { default: 42 });
        });

        it('validates options against schema when schema and errorCode set', () => {
            const schema: OptionsSchema = { default: { required: true } };
            const config: PropertyDecoratorConfig<object> = {
                schema,
                errorCode: 'INVALID_COLUMN',
                initializer: vi.fn(() => () => {}),
            };
            expect(() => Builder.buildField(config)()).toThrow(DatabaseException);
            expect(() => {
                Builder.buildField(config)({ default: 1 });
            }).not.toThrow();
        });

        it('calls ensureFieldDecoratorUniqueness when unique and decoratorName set', () => {
            const meta: Record<string, { decorators?: Array<{ decoratorName: string }> }> = {
                id: { decorators: [{ decoratorName: 'PrimaryKey' }] },
            };
            const config: PropertyDecoratorConfig<object> = {
                unique: true,
                decoratorName: 'PrimaryKey',
                initializer: vi.fn(() => () => {}),
            };
            const decorator = Builder.buildField(config)();
            const context = {
                name: 'uuid',
                metadata: meta,
                addInitializer: vi.fn((cb: () => void) => cb()),
            } as unknown as ClassFieldDecoratorContext<unknown, unknown>;
            expect(() => decorator(undefined, context)).toThrow(/Only one property can have @PrimaryKey/);
        });

        it('invokes addInitializer with a function that calls initializer result', () => {
            const setter = vi.fn();
            const config: PropertyDecoratorConfig<object> = {
                initializer: vi.fn(() => setter),
            };
            const decorator = Builder.buildField(config)();
            let capturedCb: (this: unknown) => void = () => {};
            const context = {
                name: 'x',
                metadata: {},
                addInitializer: vi.fn((cb: (this: unknown) => void) => {
                    capturedCb = cb;
                }),
            } as unknown as ClassFieldDecoratorContext<unknown, unknown>;
            decorator(undefined, context);
            const instance = {};
            capturedCb.call(instance);
            expect(setter).toHaveBeenCalledWith(instance);
        });
    });
});
