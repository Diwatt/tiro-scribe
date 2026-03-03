/**
 * Builder to build decorators: encapsulates addInitializer and the decorator return-function pattern.
 * Use buildClass(config) or buildProperty(config) where config implements ClassDecoratorConfig or PropertyDecoratorConfig
 * (i.e. for class and property decorators respectively).
 *
 * Options are typed as `object`; each decorator can declare a schema and the builder runs schemaValidator.validate, or provide a custom validate.
 * The only generic (T in buildClass) preserves the decorated class type so static members (e.g. entityName) stay typed.
 */

import { AppConfig } from '@/Config/AppConfig';
import { SchemaValidator } from './SchemaValidator';
import type { ClassDecoratorConfig, OptionsSchema, PropertyDecoratorConfig } from './Type';

// Local constructor type used only for decorator-building generics.  This mirrors
// the previous exported alias but keeps the generic decorator package free of
// any database-specific dependencies.
type ClassConstructor = abstract new (...args: unknown[]) => unknown;

declare const _DEV: boolean;

export type {
    ClassDecoratorConfig,
    OptionPropertySchema,
    OptionPropertyType,
    OptionPropertyTypeComposition,
    OptionsFromSchema,
    OptionsSchema,
    PropertyDecoratorConfig,
} from './Type';

export class Builder {
    private static readonly schemaValidator = new SchemaValidator();

    /**
     * Builds a class decorator from a config implementing ClassDecoratorConfig.
     * Options default to {} when not set; validate/decorate always receive an object.
     * Returns the same constructor type so static members stay typed.
     */
    public static buildClass(
        config: ClassDecoratorConfig<object>,
    ): (options?: object) => <T extends ClassConstructor>(target: T, context: ClassDecoratorContext<T>) => T {
        return (options?: object) => {
            const opts = options ?? {};
            Builder.validateOptions(config, opts);
            return <T extends ClassConstructor>(target: T, context: ClassDecoratorContext<T>) => {
                config.decorate(target, context, opts);
                return target;
            };
        };
    }

    /**
     * Builds a property decorator. Config: optional schema/errorCode (global validate), validate(options), before, initializer.
     * Options default to {} when not set; validate/before/initializer always receive an object.
     */
    public static buildProperty(
        config: PropertyDecoratorConfig<object>,
    ): (options?: object) => (initialValue: unknown, context: ClassFieldDecoratorContext<unknown, unknown>) => void {
        return (options?: object) => {
            const opts = options ?? {};
            Builder.validateOptions(config, opts);
            return (_: unknown, context: ClassFieldDecoratorContext<unknown, unknown>) => {
                if (new AppConfig().isDev && config.unique === true && config.decoratorName != null) {
                    const meta = context.metadata as Record<string | symbol, unknown> | undefined;
                    Builder.schemaValidator.ensurePropertyDecoratorUniqueness(
                        meta,
                        String(context.name),
                        config.decoratorName,
                    );
                }
                if (config.before != null) {
                    config.before(context, opts);
                }
                context.addInitializer(function (this: unknown) {
                    config.initializer(context, opts)(this);
                });
            };
        };
    }

    // backwards compatibility: previously buildEntity was the method name; use buildClass instead.
    // (alias removed)

    /**
     * Validates options in development mode.
     * - If schema and errorCode are both provided, runs schema validation
     * - If custom validate function is provided, calls it
     */
    private static validateOptions(
        config: { schema?: OptionsSchema; errorCode?: string; validate?: (opts: object) => void },
        opts: object,
    ): void {
        if (!new AppConfig().isDev) {
            return;
        }

        // Schema validation requires both schema and errorCode
        if (config.schema != null && config.errorCode != null) {
            Builder.schemaValidator.validate(opts, config.schema, config.errorCode);
        }

        // Custom validation (optional)
        config.validate?.(opts);
    }

    // previously buildField existed; use buildProperty
}
