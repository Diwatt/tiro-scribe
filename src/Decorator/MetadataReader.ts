/**
 * Reads decorator metadata from constructors in a standardized way.
 *
 * Storage (well-known):
 * - Entity: construct[MetadataWriter.ENTITY_METADATA_KEY] = { decoratorName: 'Entity', options: EntityOptions }
 * - Fields: construct[Symbol.metadata][propertyName] = { decorators: [{ decoratorName, options }, ...] }
 *
 * Decorators use MetadataWriter to write; MetadataReader reads.
 */

import { EntityDecorator } from './EntityDecorator';
import { FieldDecorator } from './FieldDecorator';
import { MetadataWriter } from './MetadataWriter';

export class MetadataReader {
    constructor(private readonly construct: Function) {}

    /**
     * Entity decorator data (stored by MetadataWriter as EntityDecorator; returned as-is).
     */
    public getEntity(): EntityDecorator | undefined {
        const c = this.construct as unknown as Record<string, unknown>;
        const entry = c[MetadataWriter.ENTITY_METADATA_KEY];
        return entry instanceof EntityDecorator ? entry : undefined;
    }

    /**
     * All field decorator data: one per decorator per property (e.g. Column + PrimaryKey on same property = 2 entries).
     * We build FieldDecorator here (not in MetadataWriter) because entityName (class name) is only available
     * when we have the constructor; field decorators run with only (propertyName, decoratorName, options).
     */
    public getFields(): FieldDecorator[] {
        const meta = this.getSymbolMetadata();
        if (meta == null || typeof meta !== 'object') {
            return [];
        }
        const entityName = this.construct.name;
        const out: FieldDecorator[] = [];
        for (const [propertyName, fieldMeta] of Object.entries(meta)) {
            const decorators = fieldMeta?.decorators;
            if (Array.isArray(decorators)) {
                for (const d of decorators) {
                    out.push(new FieldDecorator(d.decoratorName, entityName, propertyName, d.options));
                }
            }
        }
        return out;
    }

    /**
     * Field decorator data for one property: one per decorator on that property.
     */
    public getFieldByProperty(propertyName: string): FieldDecorator[] {
        return this.getFields().filter((f) => f.getFieldName() === propertyName);
    }

    private getSymbolMetadata(): Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }> | undefined {
        const c = this.construct as unknown as Record<symbol | string, unknown>;
        return c[Symbol.metadata as symbol] as Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }> | undefined;
    }

    /**
     * For each field that has the given decorator, maps field name → value of the given option.
     * Example: getOptionValuesByField('Column', 'default') for entity construction defaults.
     */
    public getOptionValuesByField(decoratorName: string, optionKey: string): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const field of this.getFields()) {
            if (field.getDecoratorName() !== decoratorName) {
                continue;
            }
            out[field.getFieldName()] = field.getOption(optionKey);
        }
        return out;
    }

    /**
     * Field decorator with this decorator name (e.g. 'PrimaryKey', 'Column').
     * Use for unique decorators: reader.getField('PrimaryKey').getFieldName().
     * target: constructor or instance (uses target.constructor when instance).
     */
    public static getField(target: object | Function, decoratorName: string): FieldDecorator | undefined {
        const construct = typeof target === 'function' ? target : ((target as object).constructor as Function);
        const reader = new MetadataReader(construct);
        return reader.getFields().find((f) => f.getDecoratorName() === decoratorName);
    }

    /**
     * Instance form: field decorator with this decorator name for this reader's constructor.
     */
    public getField(decoratorName: string): FieldDecorator | undefined {
        return this.getFields().find((f) => f.getDecoratorName() === decoratorName);
    }
}
