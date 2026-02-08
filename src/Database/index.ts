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
export { registry } from './Registry';
export { Repository } from './Repository';
export { EntitySerializer } from './Serializer';
export type { DataMap } from './TableBacking';
export { TableBacking } from './TableBacking';
export type { FieldTransformer } from './Transformer';
export { DateTransformer, TransformerRegistry } from './Transformer';
export type { EntityClass, ObservablePrimitive } from './Type';
