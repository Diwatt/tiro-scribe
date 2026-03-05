/**
 * Database types and constants. Single place for type definitions (entity, repository, schema row).
 */

import type { DownloadQueue } from '@/Entity/DownloadQueue';
import type { Encounter } from '@/Entity/Encounter';
import type { Patient } from '@/Entity/Patient';
import type { ProsodyMetrics } from '@/Entity/ProsodyMetrics';
import type { QueueItem } from '@/Entity/QueueItem';
import type { Therapist } from '@/Entity/Therapist';
import type { Transcription } from '@/Entity/Transcription';

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

/**
 * Manual type definition for entity tables.
 * This provides compile-time type safety while the runtime array is built dynamically.
 * Must be kept in sync with the actual entity classes in src/Entity/index.ts.
 */
type EntityTablesType = readonly [
    readonly ['therapists', typeof Therapist],
    readonly ['encounters', typeof Encounter],
    readonly ['patients', typeof Patient],
    readonly ['queue_items', typeof QueueItem],
    readonly ['download_queue', typeof DownloadQueue],
    readonly ['transcriptions', typeof Transcription],
    readonly ['prosody_metrics', typeof ProsodyMetrics],
];

/** Database schema for Kysely (table names → row types). Uses manual type definition for compile-time safety. */
export type DatabaseSchema = SchemaFromTables<EntityTablesType>;

/** Constructor type for an entity class. The constructor must extend
 * `AbstractEntity` and declare a static `entityName` property –
 * `typeof AbstractEntity` satisfies this contract.
 *
 * Generic parameter remains only for inference convenience; most callers
 * can omit it and let TypeScript infer from the argument.
 */
/** Constructor type accepted by registry and repositories: any class extending
 * AbstractEntity with a static `entityName` string. */
export type EntityClass<TEntity extends AbstractEntity = AbstractEntity> = (new (
    ...args: unknown[]
) => TEntity) & { entityName: string };
