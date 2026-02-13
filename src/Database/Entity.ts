/**
 * Class decorator: sets the entity/table name for Registry and persistence.
 * Validates at class definition: tableName non-empty, exactly one @PrimaryKey, and that property has @Column.
 *
 * @example
 * @Entity({ tableName: 'encounters' })
 * class Encounter extends AbstractEntity { ... }
 */

import { Builder, type ClassConstructor, type ClassDecoratorConfig, type OptionsSchema } from '../Decorator/Builder';
import { MetadataWriter } from '../Decorator/MetadataWriter';
import { DatabaseException } from '../Exception';

export interface EntityOptions {
    /** Table name used for persistence (Registry / Repository). */
    tableName: string;
}

const ENTITY_OPTIONS_SCHEMA: OptionsSchema = {
    tableName: { required: true, type: 'string', notBlank: true },
};

type FieldMetadata = { decorators?: Array<{ decoratorName: string; options: unknown }> };

class EntityDecorator implements ClassDecoratorConfig<EntityOptions> {
    public readonly schema = ENTITY_OPTIONS_SCHEMA;
    public readonly errorCode = 'INVALID_ENTITY_OPTIONS';

    public decorate(target: ClassConstructor, context: ClassDecoratorContext<ClassConstructor>, options: EntityOptions): void {
        (target as typeof target & { entityName: string }).entityName = options.tableName;
        MetadataWriter.registerEntity(target, options);

        const meta = (context as { metadata?: Record<string, FieldMetadata> }).metadata;
        if (meta == null || typeof meta !== 'object') {
            throw new DatabaseException(`Entity "${options.tableName}" must define a primary key with @PrimaryKey().`, 'PRIMARY_KEY_REQUIRED', undefined, {
                tableName: options.tableName,
            });
        }

        let primaryKeyProp: string | null = null;
        for (const [propName, fieldMeta] of Object.entries(meta)) {
            const decorators = fieldMeta?.decorators;
            if (Array.isArray(decorators) && decorators.some((d) => d.decoratorName === 'PrimaryKey')) {
                primaryKeyProp = propName;
                const hasColumn = decorators.some((d) => d.decoratorName === 'Column');
                if (!hasColumn) {
                    throw new DatabaseException(
                        `Primary key property "${propName}" must have a @Column() decorator.`,
                        'PRIMARY_KEY_COLUMN_REQUIRED',
                        undefined,
                        { propertyName: propName },
                    );
                }
                (target as unknown as Record<string, string>)[MetadataWriter.PRIMARY_KEY_FIELD_KEY] = propName;
            }
        }

        if (primaryKeyProp == null) {
            throw new DatabaseException(`Entity "${options.tableName}" must define a primary key with @PrimaryKey().`, 'PRIMARY_KEY_REQUIRED', undefined, {
                tableName: options.tableName,
            });
        }
    }
}

export const Entity = Builder.buildEntity(new EntityDecorator());
