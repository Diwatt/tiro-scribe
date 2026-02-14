export type EntityOptions = {
    tableName: string;
    /** Optional export name from @/Repository for custom repository (e.g. 'TherapistRepository'). */
    repositoryClass?: string;
};

/** Standardized entity decorator data (DTO returned by MetadataReader.getEntity). */
export class EntityDecorator {
    constructor(
        private readonly _decoratorName: 'Entity',
        private readonly _options: EntityOptions,
    ) {}

    public getDecoratorName(): 'Entity' {
        return this._decoratorName;
    }

    public getOptions(): EntityOptions {
        return this._options;
    }

    /** Single option by name (e.g. getOption('tableName')). */
    public getOption<K extends keyof EntityOptions>(optionName: K): EntityOptions[K] {
        return this._options[optionName];
    }

    /** Table/entity name (convenience for getOption('tableName')). */
    public getEntityName(): string {
        return this._options.tableName;
    }
}
