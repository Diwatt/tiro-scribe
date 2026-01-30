/** Standardized entity decorator data (DTO returned by MetadataReader.getEntity). */
export class EntityDecorator {
    constructor(private readonly _decoratorName: 'Entity', private readonly _options: { table_name: string }) {}

    public getDecoratorName(): 'Entity' {
        return this._decoratorName;
    }

    /** Table/entity name used for persistence. */
    public getEntityName(): string {
        return this._options.table_name;
    }

    public getOptions(): { table_name: string } {
        return this._options;
    }

    /** Single option by name (e.g. getOption('table_name')). */
    public getOption(optionName: string): unknown {
        return (this._options as Record<string, unknown>)?.[optionName];
    }
}
