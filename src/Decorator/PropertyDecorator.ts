/**
 * Standardized property decorator data (DTO returned by MetadataReader.getProperties / getProperty / getDecoratorsByProperty).
 * Option values may be literals or factories (() => value); getOption and getOptions return resolved values.
 */
import isFunction from 'lodash/isFunction';

export class PropertyDecorator<TOptions extends Record<string, unknown> = Record<string, unknown>> {
    public constructor(
        private readonly decoratorName: string,
        private readonly className: string,
        private readonly propertyName: string,
        private readonly options: TOptions,
    ) {}

    /** Name of the class this property belongs to. */
    public getClassName(): string {
        return this.className;
    }

    public getDecoratorName(): string {
        return this.decoratorName;
    }

    /** Single option by name, resolved (e.g. getOption('default') for Column default: T | (() => T)). */
    public getOption(optionName: string): unknown {
        const raw = (this.options as Record<string, unknown>)[optionName];
        return this.resolveOptionValue(raw);
    }

    /** All options with values resolved (factory → called, value → as-is). Specify TOptions when the decorator type is known (e.g. getOptions<ColumnOptions>()). */
    /**
     * All options with values resolved (factory → called, value → as-is).
     *
     * The method is generic so callers may specify the desired option type
     * without needing to cast afterwards. The class itself is also generic
     * (TOptions) for cases where the decorator author knows the shape in
     * advance; the method generic defaults to that type but may be overridden
     * when a more precise type is required at the use site.
     *
     * Example: `field.getOptions<ColumnOptions>()`.
     */
    public getOptions<T = TOptions>(): T {
        const opts: Record<string, unknown> = this.options ?? {};
        return Object.fromEntries(
            Object.entries(opts).map(([key, value]) => [key, this.resolveOptionValue(value)]),
        ) as unknown as T;
    }

    public getPropertyName(): string {
        return this.propertyName;
    }

    private resolveOptionValue(value: unknown): unknown {
        if (isFunction(value)) {
            // avoid accidentally invoking class constructors (ES6 `class`),
            // which throw when called without `new`.  we only treat the value as
            // a factory if it looks like a plain function.
            const str = Function.prototype.toString.call(value);
            if (!str.startsWith('class')) {
                return (value as () => unknown)();
            }
        }
        return value;
    }
}
