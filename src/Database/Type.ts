/**
 * Entity types and constants. Single place for type definitions.
 */

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
