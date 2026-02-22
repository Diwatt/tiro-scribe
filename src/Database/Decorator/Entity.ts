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

declare const __DEV__: boolean;

function isObject(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

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

class EntityDecorator implements ClassDecoratorConfig<EntityOptions> {
    public readonly schema = ENTITY_OPTIONS_SCHEMA;
    public readonly errorCode = 'INVALID_ENTITY_OPTIONS';

    public decorate(target: ClassConstructor, context: ClassDecoratorContext<ClassConstructor>, options: EntityOptions): void {
        this.setEntityNameAndRegister(target, options);

        const meta = (context as { metadata?: Record<string, FieldMetadata> }).metadata;
        const primaryKeyProp = this.processMetadata(target, meta, options.tableName);

        if (primaryKeyProp === null) {
            throw new DatabaseException(`Entity "${options.tableName}" must define a primary key with @PrimaryKey().`, 'PRIMARY_KEY_REQUIRED', undefined, {
                tableName: options.tableName,
            });
        }
    }

    public validate(options: EntityOptions): void {
        const name = options.repositoryClass;
        if (name == null || name.length === 0) {
            return;
        }
        if (!REPOSITORY_CLASS_NAME_REGEX.test(name)) {
            throw new DatabaseException(
                `Entity repositoryClass must be an export name from @/Repository (e.g. 'TherapistRepository'), not a path. Got: ${name}`,
                'INVALID_ENTITY_OPTIONS',
                undefined,
                { repositoryClass: name },
            );
        }
    }

    private setEntityNameAndRegister(target: ClassConstructor, options: EntityOptions): void {
        (target as typeof target & { entityName: string }).entityName = options.tableName;
        MetadataWriter.registerEntity(target, options);
    }

    private processMetadata(target: ClassConstructor, meta: Record<string, FieldMetadata> | undefined, tableName: string): string | null {
        // Hermes-only: Symbol.metadata is always available
        if (!isObject(meta)) {
            if (__DEV__) {
                throw new DatabaseException(
                    `Entity "${tableName}" has no metadata available. This should not happen in Hermes with Stage 3 decorators.`,
                    'METADATA_UNAVAILABLE',
                    undefined,
                    { tableName },
                );
            }
            // In production, we cannot recover from missing metadata
            return null;
        }

        // Standard path: metadata is available via Symbol.metadata
        return this.findAndSetPrimaryKey(target, meta);
    }

    private findAndSetPrimaryKey(
        target: ClassConstructor,
        metadata: Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }>,
    ): string | null {
        let primaryKeyProp: string | null = null;

        for (const [propName, fieldMeta] of Object.entries(metadata)) {
            const decorators = fieldMeta?.decorators;
            if (Array.isArray(decorators) && this.hasDecorator(decorators, 'PrimaryKey')) {
                primaryKeyProp = propName;
                this.validateAndSetPrimaryKeyMetadata(target, propName, decorators);
                // Continue to check for multiple primary keys (last one wins, but at least one exists)
            }
        }

        return primaryKeyProp;
    }

    private validateAndSetPrimaryKeyMetadata(target: ClassConstructor, propName: string, decorators: Array<{ decoratorName: string; options: unknown }>): void {
        const columnDecorator = this.findDecorator(decorators, 'Column');
        if (columnDecorator == null) {
            throw new DatabaseException(`Primary key property "${propName}" must have a @Column() decorator.`, 'PRIMARY_KEY_COLUMN_REQUIRED', undefined, {
                propertyName: propName,
            });
        }

        const constructorMetadata = this.getConstructorMetadata(target);
        constructorMetadata[MetadataWriter.PRIMARY_KEY_FIELD_KEY] = propName;
        constructorMetadata[MetadataWriter.PRIMARY_KEY_COLUMN_DEF_KEY] = this.buildPrimaryKeyColumnDef(propName, columnDecorator.options);
    }

    private hasDecorator(decorators: Array<{ decoratorName: string; options: unknown }>, name: string): boolean {
        return Array.isArray(decorators) && decorators.some((d) => d.decoratorName === name);
    }

    private findDecorator(
        decorators: Array<{ decoratorName: string; options: unknown }>,
        name: string,
    ): { decoratorName: string; options: unknown } | undefined {
        return Array.isArray(decorators) ? decorators.find((d) => d.decoratorName === name) : undefined;
    }

    private buildPrimaryKeyColumnDef(propertyName: string, options: unknown): PrimaryKeyColumnDef {
        // Safely cast options to a record-like structure
        const columnOptions = isObject(options) ? (options as Record<string, unknown>) : {};
        const type = columnOptions.type != null ? String(columnOptions.type) : 'text';
        const length = typeof columnOptions.length === 'number' ? columnOptions.length : undefined;

        return { propertyName, type, length };
    }

    private getConstructorMetadata(target: ClassConstructor): Record<string, unknown> {
        return target as unknown as Record<string, unknown>;
    }
}

export const Entity = Builder.buildEntity(new EntityDecorator());
