/**
 * Reads decorator metadata from constructors in a standardized way.
 *
 * Storage (well-known):
 * - Entity: construct[MetadataWriter.ENTITY_METADATA_KEY] = { decoratorName: 'Entity', options: EntityOptions }
 * - Fields: construct[Symbol.metadata][propertyName] = { decorators: [{ decoratorName, options }, ...] }
 *
 * Decorators use MetadataWriter to write; MetadataReader reads.
 */

import { AppLogger } from '@/Service/Logger';
import { DecoratorException } from '../Exception/DecoratorException';
import { EntityDecorator } from './EntityDecorator';
import { FieldDecorator } from './FieldDecorator';
import { MetadataWriter } from './MetadataWriter';
import type { MetadataConstructor } from './Type';

export class MetadataReader {
    constructor(private readonly construct: MetadataConstructor) {}

    /**
     * Entity decorator data (stored by MetadataWriter as EntityDecorator; returned as-is).
     */
    public getEntity(): EntityDecorator | undefined {
        const logger = AppLogger.getInstance();
        const c = this.construct as unknown as Record<string, unknown>;
        const entry = c[MetadataWriter.ENTITY_METADATA_KEY];

        logger.debug('[MetadataReader] Getting entity metadata:', {
            className: this.construct.name,
            hasMetadataKey: MetadataWriter.ENTITY_METADATA_KEY in c,
            entryType: typeof entry,
            isEntityDecorator: entry instanceof EntityDecorator,
        });

        if (entry instanceof EntityDecorator) {
            logger.debug('[MetadataReader] Entity metadata found:', {
                className: this.construct.name,
                tableName: entry.getEntityName(),
                decoratorName: entry.getDecoratorName(),
            });
            return entry;
        }

        logger.debug('[MetadataReader] No entity metadata found for class:', this.construct.name);
        return undefined;
    }

    /**
     * All field decorator data: one per decorator per property (e.g. Column + PrimaryKey on same property = 2 entries).
     * We build FieldDecorator here (not in MetadataWriter) because entityName (class name) is only available
     * when we have the constructor; field decorators run with only (propertyName, decoratorName, options).
     */
    public getFields(): FieldDecorator[] {
        const logger = AppLogger.getInstance();
        const meta = this.getSymbolMetadata();

        logger.debug('[MetadataReader] Getting fields metadata:', {
            className: this.construct.name,
            hasSymbolMetadata: !!meta,
            metaType: typeof meta,
        });

        if (meta == null || typeof meta !== 'object') {
            logger.debug('[MetadataReader] No symbol metadata found or not an object');
            return [];
        }

        const entityName = this.construct.name ?? '';
        const out: FieldDecorator[] = [];
        const propertyNames = Object.keys(meta);

        logger.debug('[MetadataReader] Found properties with metadata:', propertyNames);

        for (const [propertyName, fieldMeta] of Object.entries(meta)) {
            const decorators = fieldMeta?.decorators;
            if (Array.isArray(decorators)) {
                logger.debug('[MetadataReader] Processing property:', {
                    propertyName,
                    decoratorCount: decorators.length,
                });

                for (const d of decorators) {
                    const fieldDecorator = new FieldDecorator(d.decoratorName, entityName, propertyName, d.options);
                    out.push(fieldDecorator);

                    logger.debug('[MetadataReader] Created field decorator:', {
                        propertyName,
                        decoratorName: d.decoratorName,
                        hasDefault: 'default' in (d.options as Record<string, unknown>),
                        isPrimaryKey: d.decoratorName === 'PrimaryKey',
                    });
                }
            }
        }

        logger.debug('[MetadataReader] Total field decorators found:', out.length);
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

        // Hermes-only: Symbol.metadata is always available
        if (!Symbol.metadata) {
            throw new DecoratorException(
                'Symbol.metadata is not available. This should never happen in Hermes with Stage 3 decorators.',
                'METADATA_UNAVAILABLE',
            );
        }

        const metadata = c[Symbol.metadata as symbol];
        if (metadata != null && typeof metadata === 'object') {
            return metadata as Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }>;
        }

        return undefined;
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
    public static getField(target: object | MetadataConstructor, decoratorName: string): FieldDecorator | undefined {
        const logger = AppLogger.getInstance();
        const construct: MetadataConstructor = typeof target === 'function' ? target : ((target as object).constructor as MetadataConstructor);

        logger.debug('[MetadataReader] Static getField called:', {
            targetType: typeof target,
            className: construct.name,
            decoratorName,
        });

        const reader = new MetadataReader(construct);
        const fields = reader.getFields();
        const field = fields.find((f) => f.getDecoratorName() === decoratorName);

        logger.debug('[MetadataReader] Static getField result:', {
            className: construct.name,
            totalFields: fields.length,
            foundField: !!field,
            fieldName: field?.getFieldName(),
        });

        return field;
    }

    /**
     * Instance form: field decorator with this decorator name for this reader's constructor.
     */
    public getField(decoratorName: string): FieldDecorator | undefined {
        return this.getFields().find((f) => f.getDecoratorName() === decoratorName);
    }

    /**
     * All field decorators with this decorator name (e.g. getFieldsByDecorator('Column') for all @Column properties).
     */
    public getFieldsByDecorator(decoratorName: string): FieldDecorator[] {
        return this.getFields().filter((f) => f.getDecoratorName() === decoratorName);
    }
}
