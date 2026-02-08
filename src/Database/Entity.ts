/**
 * Class decorator: sets the entity/table name for Registry and persistence.
 *
 * @example
 * @Entity({ table_name: 'encounters' })
 * class Encounter extends AbstractEntity { ... }
 */

import { Builder, type ClassConstructor, type ClassDecoratorConfig, type OptionsSchema } from '../Decorator/Builder';
import { MetadataWriter } from '../Decorator/MetadataWriter';

export interface EntityOptions {
    /** Table name used for persistence (Registry / Repository). */
    table_name: string;
}

const ENTITY_OPTIONS_SCHEMA: OptionsSchema = {
    table_name: { required: true, type: 'string' },
};

class EntityDecorator implements ClassDecoratorConfig<EntityOptions> {
    public readonly schema = ENTITY_OPTIONS_SCHEMA;
    public readonly errorCode = 'INVALID_ENTITY_OPTIONS';

    public fn(target: ClassConstructor, _context: ClassDecoratorContext<ClassConstructor>, options: EntityOptions): void {
        (target as typeof target & { entityName: string }).entityName = options.table_name;
        MetadataWriter.registerEntity(target, options);
    }
}

export const Entity = Builder.buildEntity(new EntityDecorator());
