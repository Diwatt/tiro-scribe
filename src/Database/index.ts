/**
 * Database module exports.
 * Central entry point for data layer.
 */

export type { PropertyDecoratorConfig } from '../Decorator';
export {
    Builder,
    Column,
    Entity,
    MetadataReader,
} from '../Decorator';
export { AbstractEntity } from './AbstractEntity';
export { Collection } from './Collection';
export { Criteria } from './Criteria';
export type { CompiledStatement, OrderBy, QueryCriteria, QueryOptions } from './QueryCompiler';
export { registry } from './Registry';
export { Repository } from './Repository';
export type { FieldTransformer } from './Transformer';
export { DateTransformer, TransformerRegistry } from './Transformer';
export type { EntityClass } from './Type';
