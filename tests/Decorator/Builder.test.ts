import { Builder } from '@/Decorator/Builder';
import type { ClassDecoratorConfig, PropertyDecoratorConfig, OptionsSchema } from '@/Decorator/Type';
import { DatabaseException } from '@/Exception';

describe('Builder', () => {
    describe('buildClass (formerly buildEntity)', () => {
        it('returns a function that returns a decorator', () => {
            const config: ClassDecoratorConfig<object> = {
                decorate: jest.fn(),
            };
            const decoratorFactory = Builder.buildClass(config);
            expect(typeof decoratorFactory).toBe('function');
            const decorator = decoratorFactory();
            expect(typeof decorator).toBe('function');
        });

        it('defaults options to {} when not provided', () => {
            const decorate = jest.fn();
            const config: ClassDecoratorConfig<object> = { decorate };
            const decorator = Builder.buildClass(config)();
            class TestEntity {}
            const target = TestEntity;
            const context = {} as ClassDecoratorContext<typeof target>;
            decorator(target, context);
            expect(decorate).toHaveBeenCalledWith(target, context, {});
        });

        it('passes options to decorate', () => {
            const decorate = jest.fn();
            const config: ClassDecoratorConfig<{ table_name: string }> = { decorate };
            const decorator = Builder.buildClass(config)({ table_name: 'tests' });
            class TestEntity {}
            const target = TestEntity;
            const context = {} as ClassDecoratorContext<typeof target>;
            decorator(target, context);
            expect(decorate).toHaveBeenCalledWith(target, context, { table_name: 'tests' });
        });

        it('returns target from decorator', () => {
            const config: ClassDecoratorConfig<object> = { decorate: jest.fn() };
            const decorator = Builder.buildClass(config)();
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
                decorate: jest.fn(),
            };
            expect(() => Builder.buildClass(config)()).toThrow(DatabaseException);
            expect(() => {
                const decorator = Builder.buildClass(config)({ table_name: 'ok' });
                class TestEntity {}
                decorator(TestEntity, {} as never);
            }).not.toThrow();
        });

        it('calls custom validate when provided', () => {
            const validate = jest.fn();
            const config: ClassDecoratorConfig<object> = { decorate: jest.fn(), validate };
            const decorator = Builder.buildClass(config)({ x: 1 });
            class T {}
            decorator(T, {} as never);
            expect(validate).toHaveBeenCalledWith({ x: 1 });
        });
    });

    describe('buildProperty (formerly buildField)', () => {
        it('returns a function that returns a property decorator', () => {
            const config: PropertyDecoratorConfig<object> = {
                initializer: jest.fn(() => () => {}),
            };
            const decoratorFactory = Builder.buildProperty(config);
            expect(typeof decoratorFactory).toBe('function');
            const decorator = decoratorFactory();
            expect(typeof decorator).toBe('function');
        });

        it('defaults options to {}', () => {
            const initializer = jest.fn(() => () => {});
            const config: PropertyDecoratorConfig<object> = { initializer };
            const decorator = Builder.buildProperty(config)();
            const context = {
                name: 'uuid',
                metadata: {},
                addInitializer: jest.fn((cb: () => void) => cb()),
            } as unknown as ClassFieldDecoratorContext<unknown, unknown>;
            decorator(undefined, context);
            expect(initializer).toHaveBeenCalledWith(context, {});
        });

        it('passes options to before and initializer', () => {
            const before = jest.fn();
            const initializer = jest.fn(() => () => {});
            const config: PropertyDecoratorConfig<{ default: number }> = {
                before,
                initializer,
            };
            const decorator = Builder.buildProperty(config)({ default: 42 });
            const context = {
                name: 'x',
                metadata: {},
                addInitializer: jest.fn((cb: () => void) => cb()),
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
                initializer: jest.fn(() => () => {}),
            };
            expect(() => Builder.buildProperty(config)()).toThrow(DatabaseException);
            expect(() => {
                Builder.buildProperty(config)({ default: 1 });
            }).not.toThrow();
        });

        it('calls ensurePropertyDecoratorUniqueness when unique and decoratorName set', () => {
            const meta: MetadataMap = {
                id: { decorators: [{ decoratorName: 'PrimaryKey' }] },
            };
            const config: PropertyDecoratorConfig<object> = {
                unique: true,
                decoratorName: 'PrimaryKey',
                initializer: jest.fn(() => () => {}),
            };
            const decorator = Builder.buildProperty(config)();
            const context = {
                name: 'uuid',
                metadata: meta,
                addInitializer: jest.fn((cb: () => void) => cb()),
            } as unknown as ClassFieldDecoratorContext<unknown, unknown>;
            expect(() => decorator(undefined, context)).toThrow(/Only one property can have @PrimaryKey/);
        });

        it('invokes addInitializer with a function that calls initializer result', () => {
            const setter = jest.fn();
            const config: PropertyDecoratorConfig<object> = {
                initializer: jest.fn(() => setter),
            };
            const decorator = Builder.buildProperty(config)();
            let capturedCb: (this: unknown) => void = () => {};
            const context = {
                name: 'x',
                metadata: {},
                addInitializer: jest.fn((cb: (this: unknown) => void) => {
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
