/**
 * Standardized field decorator data (DTO returned by MetadataReader.getFields / getField / getFieldByProperty).
 * Option values may be literals or factories (() => value); getOption and getOptions return resolved values.
 */
export class FieldDecorator {
    constructor(
        private readonly _decoratorName: string,
        private readonly _entityName: string,
        private readonly _fieldName: string,
        private readonly _options: unknown,
    ) {}

    public getDecoratorName(): string {
        return this._decoratorName;
    }

    /** Name of the entity (class) this field belongs to. */
    public getEntityName(): string {
        return this._entityName;
    }

    public getFieldName(): string {
        return this._fieldName;
    }

    /** All options with values resolved (factory → called, value → as-is). */
    public getOptions(): Record<string, unknown> {
        const opts = (this._options as Record<string, unknown>) ?? {};
        return Object.fromEntries(
            Object.entries(opts).map(([key, value]) => [key, this.resolveOptionValue(value)]),
        );
    }

    /** Single option by name, resolved (e.g. getOption('default') for Column default: T | (() => T)). */
    public getOption(optionName: string): unknown {
        const raw = (this._options as Record<string, unknown>)?.[optionName];
        return this.resolveOptionValue(raw);
    }

    private resolveOptionValue(value: unknown): unknown {
        return typeof value === 'function' ? (value as () => unknown)() : value;
    }
}
