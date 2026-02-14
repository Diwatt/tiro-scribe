/**
 * Criteria: value object for find-by queries. Ensures only scalar values (no nested objects/arrays).
 * Use Criteria.of({ propertyName: value }) for findBy / findOneBy. Call validate(allowedKeys) before use with a query builder.
 */

import { DatabaseException } from '../Exception';

const CODE_NESTED_CRITERIA = 'REPOSITORY_NESTED_CRITERIA_NOT_SUPPORTED';
const CODE_INVALID_CRITERION_KEY = 'REPOSITORY_INVALID_CRITERION_KEY';
const CODE_INVALID_ORDER_BY_COLUMN = 'REPOSITORY_INVALID_ORDER_BY_COLUMN';

export class Criteria {
    private readonly data: Record<string, unknown>;

    private constructor(data: Record<string, unknown>) {
        this.data = data;
    }

    public static of(criteria: Record<string, unknown>): Criteria {
        for (const [key, value] of Object.entries(criteria)) {
            if (!Criteria.isScalar(value)) {
                throw new DatabaseException(
                    `Criteria "${key}" must be a scalar (string, number, boolean, null). Nested objects or arrays are not supported.`,
                    CODE_NESTED_CRITERIA,
                    undefined,
                    { key },
                );
            }
        }

        return new Criteria({ ...criteria });
    }

    public value(): Record<string, unknown> {
        return { ...this.data };
    }

    /**
     * Validates that every criterion key is in the allowed set (entity property names).
     * Call before passing to a query builder. Throws DatabaseException if any key is not allowed.
     */
    public validate(allowedKeys: ReadonlySet<string>): void {
        Criteria.requireNamesInAllowlist(Object.keys(this.data), allowedKeys, {
            code: CODE_INVALID_CRITERION_KEY,
            label: 'Criterion key',
            contextKey: 'key',
        });
    }

    /**
     * Validates that every order-by column is in the allowed set (entity property names).
     * Call before building a query with explicit orderBy. Throws DatabaseException if any column is not allowed.
     */
    public static validateOrderBy(
        specs: ReadonlyArray<{ column: string }>,
        allowedKeys: ReadonlySet<string>,
    ): void {
        Criteria.requireNamesInAllowlist(
            specs.map((s) => s.column),
            allowedKeys,
            { code: CODE_INVALID_ORDER_BY_COLUMN, label: 'Order by column', contextKey: 'column' },
        );
    }

    private static isScalar(value: unknown): boolean {
        if (value == null) {
            return true;
        }
        const t = typeof value;
        return t === 'string' || t === 'number' || t === 'boolean';
    }

    private static requireNamesInAllowlist(
        names: Iterable<string>,
        allowedKeys: ReadonlySet<string>,
        options: { code: string; label: string; contextKey: string },
    ): void {
        const allowedList = [...allowedKeys].sort().join(', ');
        for (const name of names) {
            if (!allowedKeys.has(name)) {
                throw new DatabaseException(
                    `${options.label} "${name}" is not an entity property name. Allowed: ${allowedList}.`,
                    options.code,
                    undefined,
                    { [options.contextKey]: name },
                );
            }
        }
    }
}

