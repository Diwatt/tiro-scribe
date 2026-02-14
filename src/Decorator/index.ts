/**
 * Decorator namespace: Builder, SchemaValidator, metadata.
 * Implemented decorators (Entity, Column, PrimaryKey) live in ../Database.
 */

export type { ColumnOptions, SqliteType } from '../Database/Decorator';
export { Column } from '../Database/Decorator';
export type { EntityOptions } from '../Database/Decorator';
export { Entity } from '../Database/Decorator';
export { PrimaryKey } from '../Database/Decorator';
export type {
    ClassDecoratorConfig,
    FieldDecoratorConfig,
    OptionFieldSchema,
    OptionFieldType,
    OptionFieldTypeComposition,
    OptionsFromSchema,
    OptionsSchema,
} from './Builder';
export { Builder } from './Builder';
export { EntityDecorator } from './EntityDecorator';
export { FieldDecorator } from './FieldDecorator';
export { MetadataReader } from './MetadataReader';
export { MetadataWriter } from './MetadataWriter';
export { SchemaValidator } from './SchemaValidator';
