/**
 * Decorator namespace: Builder, SchemaValidator, metadata.
 * Implemented decorators (Entity, Column, PrimaryKey) live in ../Database.
 */

export type { ColumnOptions, SqliteType } from '../Database/Column';
export { Column } from '../Database/Column';
export type { EntityOptions } from '../Database/Entity';
export { Entity } from '../Database/Entity';
export { PrimaryKey } from '../Database/PrimaryKey';
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
