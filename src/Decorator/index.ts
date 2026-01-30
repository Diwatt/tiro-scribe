/**
 * Decorator namespace: Builder, SchemaValidator, metadata.
 * Implemented decorators (Entity, Column, PrimaryKey) live in ../Database.
 */

export { Builder } from './Builder';
export type {
    ClassDecoratorConfig,
    FieldDecoratorConfig,
    OptionFieldSchema,
    OptionFieldType,
    OptionFieldTypeComposition,
    OptionsFromSchema,
    OptionsSchema,
} from './Builder';
export { EntityDecorator } from './EntityDecorator';
export { FieldDecorator } from './FieldDecorator';
export { MetadataReader } from './MetadataReader';
export { MetadataWriter } from './MetadataWriter';
export { SchemaValidator } from './SchemaValidator';

export { Column } from '../Database/Column';
export type { ColumnOptions } from '../Database/Column';
export { Entity } from '../Database/Entity';
export type { EntityOptions } from '../Database/Entity';
export { PrimaryKey } from '../Database/PrimaryKey';
