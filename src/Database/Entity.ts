/**
 * Simple interface representing the public shape of any database entity.
 *
 * This is intentionally minimal: only the members needed by repositories and
 * other generic database code.  Concrete entity classes extend
 * `AbstractEntity` (located in AbstractEntity.ts) and therefore implement this
 * interface automatically.
 *
 * Exported separately so that modules outside of the `AbstractEntity` file can
 * depend on `Entity` without pulling in the full implementation.
 */

export interface Entity {
    /** Primary key (UUID) used by repositories. */
    primaryKey: string;

    /** Convert entity to plain object for persistence. */
    toPlainObject(): Record<string, unknown>;

    /**
     * Convert entity to a data object suitable for external APIs or DTOs.
     * This method is provided by `AbstractEntity` and applies any
     * transformers defined on column getters.
     */
    toDataObject(): Record<string, unknown>;
}
