/**
 * Database module exports.
 * Central entry point for data layer.
 */

export {
    Column,
    Builder,
    Entity as EntityDecorator,
    MetadataReader,
} from '../Decorator';
export type { FieldDecoratorConfig } from '../Decorator';
export { DateTransformer, TransformerRegistry } from './Transformer';
export type { FieldTransformer } from './Transformer';
export { EntitySerializer } from './Serializer';
export { TableBacking } from './TableBacking';
export type { DataMap } from './TableBacking';
export { AbstractEntity } from './AbstractEntity';
export { registry } from './Registry';
export { Repository } from './Repository';
export type { EntityClass, ObservablePrimitive } from './Type';
