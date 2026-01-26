/**
 * Database module exports.
 * Central entry point for data layer.
 */

export { Column, Entity as EntityDecorator, getDefaultsFromMetadata } from './Decorators';
export type { DefaultValue } from './Decorators';
export { AbstractEntity, type EntityConstructor } from './AbstractEntity';
export { registry } from './Registry';
export { Repository, type RecordWithUuid } from './Repository';
export type { ObservablePrimitive } from './Type';
