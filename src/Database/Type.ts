/**
 * Entity types and constants. Single place for type definitions.
 */

import type { AbstractEntity, EntityClassStatic } from './AbstractEntity';
import type { Repository } from './Repository';

/** What getRepository() accepts: entity class (EntityClassStatic) + optional custom repo class. */
export interface EntityClass<TEntity extends AbstractEntity = AbstractEntity> extends EntityClassStatic<TEntity> {
    repositoryClass?: new () => Repository<AbstractEntity>;
}

/** Property key where the entity's observable state is stored on the instance. */
export const OBSERVABLE_KEY = '_obs' as const;

/** Node shape used by Legend-State for observable properties (get/set). */
export interface ObservableNode {
    get?(): unknown;
    set?(value: unknown): unknown;
}

/** Typed observable primitive for a single value (e.g. entity field node). */
export interface ObservablePrimitive<T = unknown> {
    get(): T;
    set(value: T): void;
}
