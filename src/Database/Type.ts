/**
 * Database types and constants. Single place for type definitions (entity, repository, schema row).
 */

import type { ENTITY_TABLES } from '@/Entity';
import type { AbstractEntity, EntityClassStatic } from './AbstractEntity';
import type { Repository } from './Repository';

/** Inserts an underscore before each capital letter (for camelCase → snake_case). */
type InsertUnderscoreBeforeCap<S extends string> = S extends `${infer A}${infer B}`
    ? B extends Capitalize<B> & string
        ? `${A}_${InsertUnderscoreBeforeCap<B>}`
        : `${A}${InsertUnderscoreBeforeCap<B>}`
    : S;

/** Converts camelCase to snake_case (e.g. therapistId → therapist_id). */
export type CamelToSnake<S extends string> = Lowercase<InsertUnderscoreBeforeCap<S>>;

/**
 * SQL row type for hybrid storage: uuid (primary key), data (JSON blob), plus real columns for foreign keys.
 * Entity properties ending in "Id" are mapped to snake_case columns via CamelToSnake (e.g. therapistId → therapist_id).
 * Aligns with lodash snakeCase for runtime column names.
 */
export type ToSqlRow<TEntity> = {
    uuid: string;
    data: string;
} & {
    [K in Extract<keyof TEntity, `${string}Id`> as CamelToSnake<K & string>]: string;
};

/** Builds table name → ToSqlRow<Entity> from the entity registry tuple. */
type SchemaFromTables<T extends readonly (readonly [string, new (...args: unknown[]) => unknown])[]> = {
    [E in T[number] as E[0]]: ToSqlRow<InstanceType<E[1]>>;
};

/** Database schema for Kysely (table names → row types). Single source of truth: ENTITY_TABLES in @/Entity. */
export type DatabaseSchema = SchemaFromTables<typeof ENTITY_TABLES>;

/** What getRepository() accepts: entity class (EntityClassStatic) + optional custom repo class. */
export interface EntityClass<TEntity extends AbstractEntity = AbstractEntity> extends EntityClassStatic<TEntity> {
    repositoryClass?: new () => Repository<AbstractEntity>;
}
