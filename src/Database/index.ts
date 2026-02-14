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
export { Criteria } from './Criteria';
export type { CompiledStatement } from './EntityGateway';
export { EntityGateway } from './EntityGateway';
export type { OrderBy, QueryCriteria, QueryOptions } from './QueryCompiler';
export type { RealForeignKeyColumn } from './RowMapper';
export { RowMapper } from './RowMapper';
export { registry } from './Registry';
export { Repository } from './Repository';
export { RecordNormalizer } from './RecordNormalizer';
export type { FieldTransformer } from './Transformer';
export { DateTransformer, TransformerRegistry } from './Transformer';
export type { EntityClass } from './Type';
