/**
 * FindByQueryBuilder tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: FindByQueryBuilder.build(). No real DB; we assert compiled SQL shape and parameters.
 */

import { describe, expect, it } from 'vitest';
import { DatabaseException } from '@/Exception';
import { FindByQueryBuilder } from '@/Database/FindByQueryBuilder';
import type { RealForeignKeyColumn } from '@/Database/Hydrator';

const TABLE = 'encounters';
const PRIMARY_KEY_FIELD = 'uuid';
const PRIMARY_KEY_COLUMN = 'uuid';
const ALLOWED_KEYS = new Set<string>(['uuid', 'therapistId', 'status']);
const REAL_FOREIGN_KEY_COLUMNS: RealForeignKeyColumn[] = [
    { propertyName: 'therapistId', columnName: 'therapist_id' },
];

function newBuilder(): FindByQueryBuilder {
    return new FindByQueryBuilder(
        TABLE,
        PRIMARY_KEY_FIELD,
        PRIMARY_KEY_COLUMN,
        REAL_FOREIGN_KEY_COLUMNS,
        ALLOWED_KEYS,
    );
}

describe('FindByQueryBuilder', () => {
    describe('Z — Zero', () => {
        it('build with empty criteria returns compiled SELECT with no WHERE', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                {},
                { defaultOrderColumn: PRIMARY_KEY_COLUMN },
            );
            expect(compiled.sql).toContain('select');
            expect(compiled.sql.toLowerCase()).toContain('from');
            expect(compiled.parameters).toEqual([]);
        });
    });

    describe('O — One', () => {
        it('build with primary key criterion includes WHERE on primary key column', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                { uuid: 'id-1' },
                { defaultOrderColumn: PRIMARY_KEY_COLUMN },
            );
            expect(compiled.sql.toLowerCase()).toContain('where');
            expect(compiled.parameters).toContain('id-1');
        });

        it('build with foreign key criterion includes WHERE on FK column', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                { therapistId: 'th-1' },
                { defaultOrderColumn: PRIMARY_KEY_COLUMN },
            );
            expect(compiled.sql.toLowerCase()).toContain('where');
            expect(compiled.parameters).toContain('th-1');
        });

        it('build with limit option adds LIMIT to SQL and parameter', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                {},
                { defaultOrderColumn: PRIMARY_KEY_COLUMN, limit: 1 },
            );
            expect(compiled.sql.toLowerCase()).toContain('limit');
            expect(compiled.parameters).toContain(1);
        });

        it('build with orderBy option uses given column and direction', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                {},
                {
                    defaultOrderColumn: PRIMARY_KEY_COLUMN,
                    orderBy: [{ columnName: 'therapist_id', direction: 'asc' }],
                },
            );
            expect(compiled.sql.toLowerCase()).toContain('order by');
        });
    });

    describe('B — Boundary', () => {
        it('build with limit 0 does not add LIMIT clause', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                {},
                { defaultOrderColumn: PRIMARY_KEY_COLUMN, limit: 0 },
            );
            expect(compiled.sql.toLowerCase()).not.toMatch(/limit\s+0/);
        });

        it('build with negative limit does not add LIMIT clause', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                {},
                { defaultOrderColumn: PRIMARY_KEY_COLUMN, limit: -1 },
            );
            expect(compiled.sql.toLowerCase()).not.toMatch(/limit\s+-1/);
        });
    });

    describe('I — Interface', () => {
        it('build returns object with sql and parameters', () => {
            const builder = newBuilder();
            const compiled = builder.build(
                { uuid: 'x' },
                { defaultOrderColumn: PRIMARY_KEY_COLUMN },
            );
            expect(typeof compiled.sql).toBe('string');
            expect(compiled.sql.length).toBeGreaterThan(0);
            expect(Array.isArray(compiled.parameters)).toBe(true);
        });
    });

    describe('E — Exceptions', () => {
        it('build throws when criterion key is not in allowed set', () => {
            const builder = newBuilder();
            expect(() =>
                builder.build(
                    { unknownKey: 'v' },
                    { defaultOrderColumn: PRIMARY_KEY_COLUMN },
                ),
            ).toThrow(DatabaseException);
            expect(() =>
                builder.build(
                    { unknownKey: 'v' },
                    { defaultOrderColumn: PRIMARY_KEY_COLUMN },
                ),
            ).toThrow(/entity property name/);
        });

        it('build throws with REPOSITORY_INVALID_CRITERION_KEY code', () => {
            const builder = newBuilder();
            try {
                builder.build(
                    { 'not-allowed': 'x' },
                    { defaultOrderColumn: PRIMARY_KEY_COLUMN },
                );
            } catch (e) {
                expect((e as DatabaseException).code).toBe('REPOSITORY_INVALID_CRITERION_KEY');
            }
        });
    });
});
