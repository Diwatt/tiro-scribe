// MetadataReader exposes class/property decorator metadata previously stored
// by MetadataWriter. It wraps raw option records in lightweight DTOs. Only
// metadata stored in the WeakMap is considered; constructor property fallbacks
// have been removed.
import { ClassDecorator } from './ClassDecorator';
// import the same weakmap symbol (can't import private, so mirror)
import { MetadataWriter } from './MetadataWriter';
import { PropertyDecorator } from './PropertyDecorator';
import type { MetadataConstructor, MetadataMap } from './Type';

export class MetadataReader {
    private cachedProperties?: PropertyDecorator[];

    public constructor(private readonly construct: MetadataConstructor) {}

    /**
     * Return a reader instance for the given target (constructor or object).
     *
     * This is a small convenience helping callers avoid the boilerplate of
     * normalising the argument themselves.  Equivalent to `new MetadataReader(
     * typeof target === 'function' ? target : target.constructor)`.
     */
    public static forTarget(target: object | MetadataConstructor): MetadataReader {
        const construct: MetadataConstructor =
            typeof target === 'function' ? target : ((target as object).constructor as MetadataConstructor);
        return new MetadataReader(construct);
    }

    /**
     * Class decorator data (stored by MetadataWriter as ClassDecorator; returned as-is).
     */
    public getClass(): ClassDecorator | undefined {
        const entryFromMap = MetadataWriter.classMetadataMap.get(this.construct as object);
        if (entryFromMap != null) {
            return new ClassDecorator('Entity', entryFromMap);
        }
        return undefined;
    }

    /**
     * Return the first decorator with the given name on the specified property,
     * or undefined if that property has none.  This is a common pattern so we
     * expose it as a helper rather than repeating `.find` everywhere.
     */
    public getDecoratorFromProperty(propertyName: string, decoratorName: string): PropertyDecorator | undefined {
        return this.getDecoratorsByProperty(propertyName).find((f) => f.getDecoratorName() === decoratorName);
    }

    /**
     * Property decorator entries for one property: one per decorator on that property.
     */
    public getDecoratorsByProperty(propertyName: string): PropertyDecorator[] {
        return this.getProperties().filter((f) => f.getPropertyName() === propertyName);
    }

    /**
     * For each property that has the given decorator, maps property name → value of the given option.
     * Example: getOptionValuesByProperty('Column', 'default') for entity construction defaults.
     */
    public getOptionValuesByProperty(decoratorName: string, optionKey: string): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const property of this.getProperties()) {
            if (property.getDecoratorName() !== decoratorName) {
                continue;
            }
            out[property.getPropertyName()] = property.getOption(optionKey);
        }
        return out;
    }

    /**
     * All property decorator data: one per decorator per property (e.g. Column + PrimaryKey
     * on same property = 2 entries). We build PropertyDecorator here (not in MetadataWriter)
     * because className is only available when we have the constructor; property decorators
     * run with only (propertyName, decoratorName, options).
     */
    public getProperties(): PropertyDecorator[] {
        if (this.cachedProperties != null) {
            return this.cachedProperties;
        }

        const meta = this.getSymbolMetadata();
        if (meta == null || typeof meta !== 'object') {
            return [];
        }

        const className = this.construct.name ?? '';
        const out: PropertyDecorator[] = [];

        for (const [propertyName, propertyMeta] of Object.entries(meta)) {
            const decorators = propertyMeta?.decorators;
            if (Array.isArray(decorators)) {
                for (const d of decorators) {
                    // options originate as unknown, but PropertyDecorator expects a record
                    out.push(
                        new PropertyDecorator(
                            d.decoratorName,
                            className,
                            propertyName,
                            d.options as Record<string, unknown>,
                        ),
                    );
                }
            }
        }

        this.cachedProperties = out;
        return out;
    }

    /**
     * All property decorators with this decorator name (e.g. getPropertiesByDecorator('Column')
     * for all @Column properties).
     */
    public getPropertiesByDecorator(decoratorName: string): PropertyDecorator[] {
        return this.getProperties().filter((f) => f.getDecoratorName() === decoratorName);
    }

    /**
     * Instance form: property decorator with this decorator name for this reader's constructor.
     */
    public getProperty(decoratorName: string): PropertyDecorator | undefined {
        return this.getProperties().find((f) => f.getDecoratorName() === decoratorName);
    }

    /**
     * Boolean check whether the given property has a decorator with the
     * requested name.  Useful for simple presence tests without pulling the
     * entire decorator object.
     */
    public hasDecoratorOnProperty(propertyName: string, decoratorName: string): boolean {
        return this.getDecoratorsByProperty(propertyName).some((f) => f.getDecoratorName() === decoratorName);
    }

    private getSymbolMetadata(): MetadataMap | undefined {
        const c = this.construct as unknown as Record<symbol | string, unknown>;

        const metadataSymbol = Symbol.metadata ?? Symbol.for('Symbol.metadata');
        const metadata = c[metadataSymbol as symbol];
        if (metadata != null && typeof metadata === 'object') {
            return metadata as MetadataMap;
        }

        return undefined;
    }
}
