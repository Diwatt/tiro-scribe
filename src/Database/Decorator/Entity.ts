/**
 * Class decorator: sets the entity/table name for Registry and persistence.
 * Validates at class definition: tableName non-empty, exactly one @PrimaryKey, and that property has @Column.
 *
 * @example
 * @Entity({ tableName: 'encounters' })
 * class Encounter extends AbstractEntity { ... }
 */

import { Builder, type ClassConstructor, type ClassDecoratorConfig, type OptionsSchema } from '../../Decorator/Builder';
import { MetadataWriter } from '../../Decorator/MetadataWriter';
import { DatabaseException } from '../../Exception';

export interface EntityOptions {
    /** Table name used for persistence (Registry / Repository). */
    tableName: string;
    /** Optional export name of a custom repository from @/Repository (e.g. 'TherapistRepository'). Must be a single identifier; Registry throws if not exported there. */
    repositoryClass?: string;
}

const ENTITY_OPTIONS_SCHEMA: OptionsSchema = {
    tableName: { required: true, type: 'string', notBlank: true },
    repositoryClass: { required: false, type: 'string', notBlank: true },
};

/** Export name must be a single identifier (no path). Registry validates that it exists in @/Repository. */
const REPOSITORY_CLASS_NAME_REGEX = /^[A-Z][a-zA-Z0-9]*$/;

type FieldMetadata = { decorators?: Array<{ decoratorName: string; options: unknown }> };

interface PrimaryKeyColumnDef {
    propertyName: string;
    type: string;
    length?: number;
}

class EntityDecorator implements ClassDecoratorConfig<EntityOptions>
{
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
                const columnDecorator = decorators.find((d) => d.decoratorName === 'Column');
                if (columnDecorator == null) {
                    throw new DatabaseException(
                        `Primary key property "${propName}" must have a @Column() decorator.`,
                        'PRIMARY_KEY_COLUMN_REQUIRED',
                        undefined,
                        { propertyName: propName },
                    );
                }
                const c = target as unknown as Record<string, unknown>;
                c[MetadataWriter.PRIMARY_KEY_FIELD_KEY] = propName;
                c[MetadataWriter.PRIMARY_KEY_COLUMN_DEF_KEY] = this.buildPrimaryKeyColumnDef(propName, columnDecorator.options);
            }
        }

        if (primaryKeyProp == null) {
            throw new DatabaseException(`Entity "${options.tableName}" must define a primary key with @PrimaryKey().`, 'PRIMARY_KEY_REQUIRED', undefined, {
                tableName: options.tableName,
            });
        }
    }

    public validate(options: EntityOptions): void {
        const name = options.repositoryClass;
        if (name != null && name.length > 0 && !REPOSITORY_CLASS_NAME_REGEX.test(name)) {
            throw new DatabaseException(
                `Entity repositoryClass must be an export name from @/Repository (e.g. 'TherapistRepository'), not a path. Got: ${name}`,
                'INVALID_ENTITY_OPTIONS',
                undefined,
                { repositoryClass: name },
            );
        }
    }

    private buildPrimaryKeyColumnDef(propertyName: string, options: unknown): PrimaryKeyColumnDef {
        const columnOptions = (options as Record<string, unknown>) ?? {};
        const type = (columnOptions.type != null ? String(columnOptions.type) : 'text') as string;
        const length = typeof columnOptions.length === 'number' ? columnOptions.length : undefined;

        return { propertyName, type, length };
    }
}

export const Entity = Builder.buildEntity(new EntityDecorator());
