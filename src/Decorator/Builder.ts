/**
 * Builder to build decorators: encapsulates addInitializer and the decorator return-function pattern.
 * Use buildEntity(config) or buildField(config) where config implements ClassDecoratorConfig or FieldDecoratorConfig.
 *
 * Options are typed as `object`; each decorator can declare a schema and the builder runs schemaValidator.validate, or provide a custom validate.
 * The only generic (T in buildEntity) preserves the decorated class type so static members (e.g. entityName) stay typed.
 */

import { SchemaValidator } from './SchemaValidator';
import type { ClassConstructor, ClassDecoratorConfig, FieldDecoratorConfig, OptionsSchema } from './Type';

declare const __DEV__: boolean;

export type {
    ClassConstructor,
    ClassDecoratorConfig,
    FieldDecoratorConfig,
    OptionFieldSchema,
    OptionFieldType,
    OptionFieldTypeComposition,
    OptionsFromSchema,
    OptionsSchema,
} from './Type';

// biome-ignore lint/complexity/noStaticOnlyClass: decorator builder with static schemaValidator
export class Builder {
    private static readonly schemaValidator = new SchemaValidator();

    /**
     * Validates options in development mode.
     * - If schema and errorCode are both provided, runs schema validation
     * - If custom validate function is provided, calls it
     */
    private static validateOptions(config: { schema?: OptionsSchema; errorCode?: string; validate?: (opts: object) => void }, opts: object): void {
        if (!__DEV__) {
            return;
        }

        // Schema validation requires both schema and errorCode
        if (config.schema != null && config.errorCode != null) {
            Builder.schemaValidator.validate(opts, config.schema, config.errorCode);
        }

        // Custom validation (optional)
        config.validate?.(opts);
    }

    /**
     * Builds an entity (class) decorator from a config implementing ClassDecoratorConfig.
     * Options default to {} when not set; validate/decorate always receive an object.
     * Returns the same constructor type so static members (e.g. entityName) are preserved.
     */
    public static buildEntity(
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
     * Builds a field decorator. Config: optional schema/errorCode (global validate), validate(options), before, initializer.
     * Options default to {} when not set; validate/before/initializer always receive an object.
     */
    public static buildField(
        config: FieldDecoratorConfig<object>,
    ): (options?: object) => (initialValue: unknown, context: ClassFieldDecoratorContext<unknown, unknown>) => void {
        return (options?: object) => {
            const opts = options ?? {};
            Builder.validateOptions(config, opts);
            return (_: unknown, context: ClassFieldDecoratorContext<unknown, unknown>) => {
                if (__DEV__ && config.unique === true && config.decoratorName != null) {
                    const meta = context.metadata as Record<string | symbol, unknown> | undefined;
                    Builder.schemaValidator.ensureFieldDecoratorUniqueness(meta, String(context.name), config.decoratorName);
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
}
