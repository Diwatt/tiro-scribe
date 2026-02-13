/**
 * FindByQueryBuilder: builds a SELECT statement from scalar criteria, order by, and limit.
 * Single responsibility: criteria + order + limit → compiled SQL. Used by Repository findBy/findOneBy.
 */

import type { CompiledQuery, SelectQueryBuilder } from 'kysely';
import { sql } from 'kysely';
import { DatabaseException } from '../Exception';
import type { RealForeignKeyColumn } from './Hydrator';
import { qb } from './Kysely';
import type { DatabaseSchema } from './Type';

/** Resolved order clause: SQL column name and direction. */
export interface OrderByClause {
    columnName: string;
    direction: 'asc' | 'desc';
}

export interface FindByQueryOptions {
    limit?: number;
    orderBy?: OrderByClause[];
    defaultOrderColumn: string,
}

/** Kysely select builder for our schema; avoids redefining a builder type. */
type SelectBuilder = SelectQueryBuilder<DatabaseSchema, keyof DatabaseSchema, Record<string, unknown>>;

export class FindByQueryBuilder {
    public constructor(
        private readonly tableName: string,
        private readonly primaryKeyField: string,
        private readonly primaryKeyColumnName: string,
        private readonly realForeignKeyColumns: RealForeignKeyColumn[],
        /** Allowed criteria keys (entity property names). Keys not in this set are rejected to prevent injection into json_extract path. */
        private readonly allowedCriteriaKeys: ReadonlySet<string>,
    ) {}

    public build(criteria: Record<string, unknown>, options: FindByQueryOptions): CompiledQuery {
        const table = this.tableName as keyof DatabaseSchema;
        let query: SelectBuilder = qb.selectFrom(table).selectAll() as SelectBuilder;
        for (const key of Object.keys(criteria)) {
            query = this.applyCriterion(query, key, criteria[key]);
        }

        if (options.orderBy != null && options.orderBy.length > 0) {
            for (const spec of options.orderBy) {
                query = query.orderBy(qb.dynamic.ref(spec.columnName), spec.direction);
            }
        } else {
            query = query.orderBy(qb.dynamic.ref(options.defaultOrderColumn), 'desc');
        }

        if (options.limit != null && options.limit > 0) {
            query = query.limit(options.limit);
        }

        return query.compile();
    }

    private applyCriterion(query: SelectBuilder, key: string, value: unknown): SelectBuilder {
        if (key === this.primaryKeyField) {
            return query.where(this.primaryKeyColumnName as 'uuid', '=', value as string) as SelectBuilder;
        }
        const foreignKeyColumn = this.realForeignKeyColumns.find((c) => c.propertyName === key);
        if (foreignKeyColumn != null) {
            return query.where(foreignKeyColumn.columnName as 'uuid', '=', value as string) as SelectBuilder;
        }
        if (!this.allowedCriteriaKeys.has(key)) {
            throw new DatabaseException(
                `Criteria key must be an entity property name. Got: "${key}".`,
                'REPOSITORY_INVALID_CRITERION_KEY',
                undefined,
                { key, tableName: this.tableName, },
            );
        }

        return query.where(sql`json_extract(data, '$.${sql.raw(key)}')`, '=', value) as SelectBuilder;
    }
}
