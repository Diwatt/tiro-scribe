/**
 * QueryCompiler: compiles SELECT and EXISTS SQL for Repository findBy/findOneBy/exists.
 * Compile-only (no execution). Property→column mapping and validation via EntityMetadata and Criteria.
 */

import { sql } from 'kysely';
import { Criteria } from './Criteria';
import type { EntityMetadata } from './Decorator';
import { qb } from './Kysely';
import type { DatabaseSchema } from './Type';

/** Single boolean condition for WHERE (e.g. sql`column = value`). */
type WhereCondition = ReturnType<typeof sql<boolean>>;

export type QueryCriteria = Record<string, unknown>;

export interface OrderBy {
    column: string;
    direction: 'asc' | 'desc';
}

export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: OrderBy[];
    defaultOrderColumn?: string;
}

/** Compiled SQL statement ready for execution. */
export interface CompiledStatement {
    sql: string;
    parameters: unknown[];
}

export class QueryCompiler {
    private readonly metadata: EntityMetadata;
    private readonly tableName: string;

    public constructor(tableName: string, metadata: EntityMetadata) {
        this.tableName = tableName;
        this.metadata = metadata;
    }

    public build(criteria: QueryCriteria, options?: QueryOptions): CompiledStatement {
        const table = this.tableName as keyof DatabaseSchema;
        const selectColumns = [
            this.metadata.getPrimaryKeyColumnName(),
            'data',
            ...this.metadata.getForeignKeyColumns().map((c) => c.columnName),
        ] as (keyof DatabaseSchema[keyof DatabaseSchema])[];
        let query = qb.selectFrom(table).select(selectColumns);
        for (const condition of this.whereConditions(criteria)) {
            query = query.where(condition);
        }
        const orderClauses = this.orderByClauses(options);
        for (const { expression, direction } of orderClauses) {
            query = query.orderBy(sql.raw(expression), direction);
        }
        if (options?.limit != null) {
            query = query.limit(options.limit);
        }
        const offsetVal = options?.offset ?? 0;
        if (offsetVal > 0) {
            query = query.offset(offsetVal);
        }
        const compiled = query.compile();

        return { sql: compiled.sql, parameters: [...compiled.parameters] };
    }

    public compileExists(criteria: QueryCriteria): CompiledStatement {
        const table = this.tableName as keyof DatabaseSchema;
        let query = qb.selectFrom(table).select(sql<number>`1`.as('1')).limit(1);
        for (const condition of this.whereConditions(criteria)) {
            query = query.where(condition);
        }
        const compiled = query.compile();

        return { sql: compiled.sql, parameters: [...compiled.parameters] };
    }

    private orderByClauses(
        options: QueryOptions | undefined,
    ): Array<{ expression: string; direction: 'asc' | 'desc' }> {
        const orderBys = this.resolveOrderBy(options);

        return orderBys.map((item) => {
            const direction = item.direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
            return { expression: this.metadata.getColumnExpression(item.column), direction };
        });
    }

    private resolveOrderBy(options: QueryOptions | undefined): OrderBy[] {
        if (options?.orderBy != null && options.orderBy.length > 0) {
            const allowedKeys = new Set(this.metadata.getColumnNames());
            Criteria.validateOrderBy(options.orderBy, allowedKeys);
            return options.orderBy;
        }
        const defaultColumn = this.metadata.getOrderByColumnName();
        if (defaultColumn) {
            return [{ column: defaultColumn, direction: 'asc' }];
        }

        return [];
    }

    private whereConditions(criteria: QueryCriteria): readonly WhereCondition[] {
        const conditions: WhereCondition[] = [];
        for (const [key, value] of Object.entries(criteria)) {
            const columnExpression = this.metadata.getColumnExpression(key);
            conditions.push(sql<boolean>`${sql.raw(columnExpression)} = ${value}`);
        }

        return conditions;
    }
}
