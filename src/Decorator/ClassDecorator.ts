/**
 * Class decorator metadata (DTO returned by MetadataReader.getEntity).
 * formerly named EntityDecorator; renamed to avoid confusion with
 * Database/Decorator/Entity.EntityDecorator implementation.
 */
export class ClassDecorator {
    constructor(
        private readonly _name: string,
        private readonly _options: Record<string, unknown>,
    ) {}

    public getName(): string {
        return this._name;
    }

    public getOptions(): Record<string, unknown> {
        return this._options;
    }

    /** Single option by name (e.g. getOption('tableName')). */
    public getOption<K extends string>(optionName: K): unknown {
        // options are opaque at this level; database-specific decorators may
        // provide their own typed accessors if needed.
        return (this._options as Record<string, unknown>)[optionName];
    }
}
