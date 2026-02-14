/**
 * Database decorators: Entity, Column, PrimaryKey, ForeignKey.
 * EntityMetadata: single entry point to read all decorator data (getPrimaryKey, getColumns, getForeignKey, etc.).
 * Shared Builder/MetadataReader stay in src/Decorator.
 */

export type { ColumnOptions, SqliteType } from './Column';
export { Column } from './Column';
export { EntityMetadata, type ForeignKeyColumnRef } from './EntityMetadata';
export type { EntityOptions } from './Entity';
export { Entity } from './Entity';
export type { ForeignKeyOptions } from './ForeignKey';
export { ForeignKey, OnDeleteAction } from './ForeignKey';
export { PrimaryKey } from './PrimaryKey';
