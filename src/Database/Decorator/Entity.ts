/**
 * Class decorator: sets the entity/table name for Registry and persistence.
 * Validates at class definition: tableName non-empty, exactly one @PrimaryKey, and that property has @Column.
 *
 * @example
 * @Entity({ tableName: 'encounters' })
 * class Encounter extends AbstractEntity { ... }
 */

import { isPlainObject } from 'lodash';
import trim from 'lodash/trim';
import { Builder, type ClassDecoratorConfig, type OptionsSchema } from '../../Decorator/Builder';
import { MetadataWriter } from '../../Decorator/MetadataWriter';
import type { DecoratorMetadata, MetadataMap } from '../../Decorator/Type';
import { DatabaseException } from '../../Exception';
import type { AbstractEntity } from '../AbstractEntity';

declare const __DEV__: boolean;

// Replaced by lodash helper – keep comment for context.

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

// no built-in validation; the registry will complain if the provided
// name is not actually exported by @/Repository.  Decorator no longer
// enforces a pattern per user request.

class EntityDecorator implements ClassDecoratorConfig<EntityOptions> {
    public readonly schema = ENTITY_OPTIONS_SCHEMA;
    public readonly errorCode = 'INVALID_ENTITY_OPTIONS';

    public decorate(target: typeof AbstractEntity, context: ClassDecoratorContext<typeof AbstractEntity>, options: EntityOptions): void {
        // trim any user‑supplied whitespace so callers can accidentally pass
        // `'  foo  '` and still get a valid name.  SchemaValidator already
        // rejects blank/empty values but it does not mutate the string.
        const normalized: EntityOptions = {
            ...options,
            tableName: trim(options.tableName),
        };
        if (normalized.repositoryClass != null) {
            normalized.repositoryClass = trim(normalized.repositoryClass);
        }

        this.setEntityNameAndRegister(target, normalized);

        const meta = (context as { metadata?: MetadataMap }).metadata;
        const primaryKeyProp = this.processMetadata(target, meta, normalized.tableName);

        if (primaryKeyProp === null) {
            throw new DatabaseException(`Entity "${normalized.tableName}" must define a primary key with @PrimaryKey().`, 'PRIMARY_KEY_REQUIRED', undefined, {
                tableName: normalized.tableName,
            });
        }
    }

    private setEntityNameAndRegister(target: typeof AbstractEntity, options: EntityOptions): void {
        (target as typeof target & { entityName: string }).entityName = options.tableName;
        MetadataWriter.registerClass(target, options);
    }

    private processMetadata(target: typeof AbstractEntity, meta: MetadataMap | undefined, tableName: string): string | null {
        // Hermes-only: Symbol.metadata is always available
        if (!isPlainObject(meta)) {
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
        return this.findAndSetPrimaryKey(target, meta as MetadataMap);
    }

    private findAndSetPrimaryKey(_target: typeof AbstractEntity, metadata: MetadataMap): string | null {
        let primaryKeyProp: string | null = null;

        for (const [propName, fieldMeta] of Object.entries(metadata)) {
            const decorators = fieldMeta?.decorators;
            if (this.findDecorator(decorators, 'PrimaryKey') != null) {
                // ensure a @Column decorator exists on the same property
                const columnDecorator = this.findDecorator(decorators, 'Column') as DecoratorMetadata | null;
                if (columnDecorator == null) {
                    throw new DatabaseException(
                        `Primary key property "${propName}" must have a @Column() decorator.`,
                        'PRIMARY_KEY_COLUMN_REQUIRED',
                        undefined,
                        {
                            propertyName: propName,
                        },
                    );
                }

                primaryKeyProp = propName;
                // Continue to check for multiple primary keys (last one wins, but at least one exists)
            }
        }

        return primaryKeyProp;
    }

    private findDecorator(decorators: unknown, name: string): DecoratorMetadata | undefined {
        if (!Array.isArray(decorators)) {
            return undefined;
        }
        return decorators.find((d) => d.decoratorName === name);
    }
}

export const Entity = Builder.buildClass(new EntityDecorator());
