/**
 * Decorator namespace: Builder, SchemaValidator, metadata.
 * Implemented decorators (Entity, Column, PrimaryKey) live in ../Database.
 */

export type { ColumnOptions, EntityOptions, SqliteType } from '../Database/Decorator';
export { Column, Entity, PrimaryKey } from '../Database/Decorator';
export type {
    ClassDecoratorConfig,
    OptionPropertySchema,
    OptionPropertyType,
    OptionPropertyTypeComposition,
    OptionsFromSchema,
    OptionsSchema,
    PropertyDecoratorConfig,
} from './Builder';
export { Builder } from './Builder';
export { ClassDecorator } from './ClassDecorator';
export { MetadataReader } from './MetadataReader';
export { MetadataWriter } from './MetadataWriter';
export { PropertyDecorator } from './PropertyDecorator';
export { SchemaValidator } from './SchemaValidator';
