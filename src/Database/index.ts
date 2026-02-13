/**
 * Database module exports.
 * Central entry point for data layer.
 */

export type { FieldDecoratorConfig } from '../Decorator';
export {
    Builder,
    Column,
    Entity as EntityDecorator,
    MetadataReader,
} from '../Decorator';
export { AbstractEntity } from './AbstractEntity';
export { Executor } from './Executor';
export type { CompiledStatement } from './Executor';
export { Hydrator } from './Hydrator';
export { registry } from './Registry';
export { Repository } from './Repository';
export type { RealForeignKeyColumn } from './Hydrator';
export { EntitySerializer } from './Serializer';
export type { FieldTransformer } from './Transformer';
export { DateTransformer, TransformerRegistry } from './Transformer';
export type { EntityClass } from './Type';
