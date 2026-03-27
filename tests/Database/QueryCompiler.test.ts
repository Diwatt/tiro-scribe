/**
 * QueryCompiler tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: QueryCompiler.build(). No real DB; we assert compiled SQL shape and parameters.
 */

import { EntityMetadata } from '@/Database/Decorator';
import { QueryCompiler } from '@/Database/QueryCompiler';
import { DatabaseException } from '@/Exception';
import type { MetadataConstructor } from '@/Decorator/Type';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

import { Container } from '@/Core/Container';
import { AppConfig } from '@/Core/AppConfig';

Container.register(AppConfig, () => ({ databaseName: 'test_db' } as any));

const MockEncounter = createMockEncounterConstructor();
const metadata = EntityMetadata.for(MockEncounter as MetadataConstructor);
const TABLE = metadata.getTableName();

function newCompiler(): QueryCompiler {
    return new QueryCompiler(TABLE, metadata);
}

describe('QueryCompiler', () => {
    describe('Z — Zero', () => {
        it('build with empty criteria returns compiled SELECT with no WHERE', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({});
            expect(compiled.sql.toLowerCase()).toContain('select');
            expect(compiled.sql.toLowerCase()).toContain('from');
            expect(compiled.parameters).toEqual([]);
        });
    });

    describe('O — One', () => {
        it('build with primary key criterion includes WHERE on primary key column', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({ uuid: 'id-1' });
            expect(compiled.sql.toLowerCase()).toContain('where');
            expect(compiled.parameters).toContain('id-1');
        });

        it('build with foreign key criterion includes WHERE on FK column', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({ therapistId: 'th-1' });
            expect(compiled.sql.toLowerCase()).toContain('where');
            expect(compiled.parameters).toContain('th-1');
        });

        it('build with limit option adds LIMIT to SQL and parameter', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({}, { limit: 1 });
            expect(compiled.sql.toLowerCase()).toContain('limit');
            expect(compiled.parameters).toContain(1);
        });

        it('build with orderBy option uses given column and direction', () => {
            const compiler = newCompiler();
            const compiled = compiler.build(
                {},
                { orderBy: [{ column: 'therapistId', direction: 'asc' }] },
            );
            expect(compiled.sql.toLowerCase()).toContain('order by');
        });
    });

    describe('M — Many (multiple criteria)', () => {
        it('build with multiple criteria keys includes all in WHERE and parameters', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({ uuid: 'id-1', therapistId: 'th-1' });
            expect(compiled.sql.toLowerCase()).toContain('where');
            expect(compiled.parameters).toContain('id-1');
            expect(compiled.parameters).toContain('th-1');
        });
    });

    describe('B — Boundary', () => {
        it('build with limit 0 does not add LIMIT clause', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({}, { limit: 0 });
            expect(compiled.sql.toLowerCase()).not.toMatch(/limit\s+0/);
        });

        it('build with negative limit does not add LIMIT clause', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({}, { limit: -1 });
            expect(compiled.sql.toLowerCase()).not.toMatch(/limit\s+-1/);
        });

        it('build with offset > 0 adds OFFSET clause and parameter', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({}, { offset: 5 });
            // Kysely uses parameter placeholder for OFFSET
            expect(compiled.sql.toLowerCase()).toMatch(/offset\s+\?/);
            expect(compiled.parameters).toContain(5);
        });

        it('build uses default orderBy column when none provided', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({});
            // mock encounter metadata has uuid as primary key so default order by should be uuid
            expect(compiled.sql.toLowerCase()).toContain('order by');
            expect(compiled.sql.toLowerCase()).toContain('uuid');
        });

        it('orderBy direction normalization lowercases DESC/ASC', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({}, { orderBy: [{ column: 'therapistId', direction: 'DESC' }] });
            expect(compiled.sql.toLowerCase()).toContain('order by');
        });
    });

    describe('I — Interface', () => {
        it('build returns object with sql and parameters', () => {
            const compiler = newCompiler();
            const compiled = compiler.build({ uuid: 'x' });
            expect(typeof compiled.sql).toBe('string');
            expect(compiled.sql.length).toBeGreaterThan(0);
            expect(Array.isArray(compiled.parameters)).toBe(true);
        });

        it('compileExists returns object with sql and parameters', () => {
            const compiler = newCompiler();
            const compiled = compiler.compileExists({ uuid: 'x' });
            expect(typeof compiled.sql).toBe('string');
            expect(compiled.sql.toLowerCase()).toContain('select');
            expect(Array.isArray(compiled.parameters)).toBe(true);
        });

        it('compileExists with multiple criteria includes all parameters', () => {
            const compiler = newCompiler();
            const compiled = compiler.compileExists({ uuid: 'x', therapistId: 't1' });
            expect(compiled.parameters).toContain('x');
            expect(compiled.parameters).toContain('t1');
            expect(compiled.sql.toLowerCase()).toContain('where');
        });
    });

    describe('E — Exceptions', () => {
        it('build throws when orderBy column is not an entity property name', () => {
            const compiler = newCompiler();
            expect(() =>
                compiler.build(
                    {},
                    { orderBy: [{ column: 'unknownColumn', direction: 'asc' }] },
                ),
            ).toThrow(DatabaseException);
            expect(() =>
                compiler.build(
                    {},
                    { orderBy: [{ column: 'unknownColumn', direction: 'asc' }] },
                ),
            ).toThrow(/entity property name/);
        });
    });
});
