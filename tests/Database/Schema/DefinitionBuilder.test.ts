/**
 * DefinitionBuilder tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: DefinitionBuilder. All dependencies (MetadataReader) are mocked.
 */

import { EntityDecorator } from '@/Decorator/EntityDecorator';
import type { MetadataReader } from '@/Decorator/MetadataReader';
import { FieldDecorator } from '@/Decorator/FieldDecorator';
import { DefinitionBuilder } from '@/Database/Schema/DefinitionBuilder';
import { OnDeleteAction } from '@/Database/ForeignKey';
import { DatabaseException } from '@/Exception';
import { TableDefinition } from '@/Database/Schema/TableDefinition';
import { describe, it, expect, vi } from 'vitest';

function createMockReader(overrides: {
    getEntity?: () => EntityDecorator | undefined;
    getPrimaryKeyColumn?: () => FieldDecorator | undefined;
    getFieldsByDecorator?: (name: string) => FieldDecorator[];
    getFieldByProperty?: (propertyName: string) => FieldDecorator[];
}): MetadataReader {
    return {
        getEntity: overrides.getEntity ?? vi.fn(),
        getPrimaryKeyColumn: overrides.getPrimaryKeyColumn ?? vi.fn(),
        getFieldsByDecorator: overrides.getFieldsByDecorator ?? vi.fn(() => []),
        getFieldByProperty: overrides.getFieldByProperty ?? vi.fn(() => []),
    } as unknown as MetadataReader;
}

function createEntityDecorator(tableName: string): EntityDecorator {
    return new EntityDecorator('Entity', { tableName });
}

function createPrimaryKeyColumnField(propertyName: string, type: string, length?: number): FieldDecorator {
    return new FieldDecorator('Column', 'TestEntity', propertyName, { type, length, default: '' });
}

function createColumnField(
    propertyName: string,
    options: { type: string; length?: number; index?: boolean; fullText?: boolean; fullTextPath?: string },
): FieldDecorator {
    return new FieldDecorator('Column', 'TestEntity', propertyName, { default: '', ...options });
}

describe('DefinitionBuilder', () => {
    describe('Z — Zero (missing / null inputs)', () => {
        it('throws DatabaseException with code ENTITY_METADATA_REQUIRED when getEntity returns undefined', () => {
            const reader = createMockReader({
                getEntity: () => undefined,
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('uuid', 'varchar', 36),
            });
            try {
                new DefinitionBuilder(reader);
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('ENTITY_METADATA_REQUIRED');
            }
        });

        it('throws DatabaseException with code ENTITY_METADATA_REQUIRED when getPrimaryKeyColumn returns undefined', () => {
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('my_table'),
                getPrimaryKeyColumn: () => undefined,
            });
            try {
                new DefinitionBuilder(reader);
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('ENTITY_METADATA_REQUIRED');
            }
        });

        it('throws when both getEntity and getPrimaryKeyColumn are undefined', () => {
            const reader = createMockReader({
                getEntity: () => undefined,
                getPrimaryKeyColumn: () => undefined,
            });
            expect(() => new DefinitionBuilder(reader)).toThrow(DatabaseException);
        });
    });

    describe('O — One (minimal happy path)', () => {
        it('build returns TableDefinition with tableName and primary key column when one entity and one pk column', () => {
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('uuid', 'varchar', 36),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            expect(definition).toBeInstanceOf(TableDefinition);
            expect(definition.tableName).toBe('items');
            expect(definition.primaryKeyColumnName).toBe('uuid');
            expect(definition.columns).toContain('uuid VARCHAR(36) PRIMARY KEY');
            expect(definition.columns).toContain('data TEXT NOT NULL');
            expect(definition.indexes).toEqual([]);
            expect(definition.fullTextSearchFields).toEqual([]);
        });

        it('build uses snake_case for primary key column name when property is camelCase', () => {
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('my_entities'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('primaryKeyId', 'varchar', 36),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            expect(definition.primaryKeyColumnName).toBe('primary_key_id');
            expect(definition.columns[0]).toContain('primary_key_id');
        });

        it('adds REFERENCES clause and ON DELETE action for ForeignKey on primary key', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const targetEntity = { entityName: 'parents' };
            const fkOnPk = new FieldDecorator('ForeignKey', 'Entity', 'uuid', {
                target: () => targetEntity,
                column: 'uuid',
                onDelete: OnDeleteAction.Cascade,
            });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('children'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: () => [],
                getFieldByProperty: (prop) => (prop === 'uuid' ? [pkField, fkOnPk] : []),
            });
            const definition = new DefinitionBuilder(reader).build();
            expect(definition.columns[0]).toBe('uuid VARCHAR(36) REFERENCES parents(uuid) ON DELETE CASCADE PRIMARY KEY');
            expect(definition.indexes).toEqual([]);
        });
    });

    describe('M — Many (multiple columns, indexed, full-text)', () => {
        it('build includes virtual columns and indexes for each Column with index true', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const indexedA = createColumnField('therapistId', { type: 'varchar', length: 36, index: true });
            const indexedB = createColumnField('createdAt', { type: 'datetime', index: true });
            const notIndexed = createColumnField('name', { type: 'varchar', index: false });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('encounters'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [indexedA, indexedB, notIndexed] : []),
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            expect(definition.columns.length).toBeGreaterThan(2);
            expect(definition.columns.some((c) => c.includes('therapist_id') && c.includes('VIRTUAL'))).toBe(true);
            expect(definition.columns.some((c) => c.includes('created_at') && c.includes('VIRTUAL'))).toBe(true);
            expect(definition.indexes.length).toBe(2);
            expect(definition.indexes.some((i) => i.includes('idx_encounters_therapist_id'))).toBe(true);
            expect(definition.indexes.some((i) => i.includes('idx_encounters_created_at'))).toBe(true);
        });

        it('build includes fullTextSearchFields for each Column with fullText true', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const ftsField = createColumnField('transcript', {
                type: 'text',
                fullText: true,
                fullTextPath: '$.text',
            });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('encounters'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [ftsField] : []),
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            expect(definition.fullTextSearchFields).toHaveLength(1);
            expect(definition.fullTextSearchFields[0].name).toBe('transcript');
            expect(definition.fullTextSearchFields[0].jsonPath).toBe('$.text');
        });

        it('build emits real column (not VIRTUAL) with REFERENCES for Column with ForeignKey', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const therapistIdField = createColumnField('therapistId', { type: 'varchar', length: 36, index: true });
            const targetEntity = { entityName: 'therapists' };
            const fkField = new FieldDecorator('ForeignKey', 'Encounter', 'therapistId', {
                target: () => targetEntity,
                column: 'uuid',
                onDelete: OnDeleteAction.Restrict,
            });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('encounters'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) =>
                    name === 'Column' ? [therapistIdField] : [],
                getFieldByProperty: (prop) =>
                    prop === 'therapistId' ? [therapistIdField, fkField] : [],
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            const therapistIdColumn = definition.columns.find((c) => c.includes('therapist_id') && c.includes('REFERENCES'));
            expect(therapistIdColumn).toBeDefined();
            expect(therapistIdColumn).toContain('REFERENCES therapists(uuid) ON DELETE RESTRICT');
            expect(therapistIdColumn).not.toContain('VIRTUAL');
        });
    });

    describe('B — Boundary', () => {
        it('build with primary key type without length does not append length in SQL type', () => {
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('id', 'text'),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            expect(definition.columns[0]).toBe('id TEXT PRIMARY KEY');
        });

        it('build with VARCHAR and length 1 uses VARCHAR(1)', () => {
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('code', 'varchar', 1),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            expect(definition.columns[0]).toContain('VARCHAR(1)');
        });

        it('excludes primary key property from column fields when building indexed columns', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const otherColumn = createColumnField('name', { type: 'varchar', index: true });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [otherColumn] : []),
            });
            const builder = new DefinitionBuilder(reader);
            const definition = builder.build();
            expect(definition.columns.filter((c) => c.includes('uuid') && c.includes('PRIMARY KEY'))).toHaveLength(1);
            expect(definition.columns.filter((c) => c.includes('name') || c.includes('uuid'))).toHaveLength(2);
        });

        it("defaults ForeignKey referenced column to 'uuid' when not provided", () => {
            const pkField = createPrimaryKeyColumnField('id', 'text');
            const col = createColumnField('ownerId', { type: 'varchar', length: 36, index: true });
            const targetEntity = { entityName: 'owners' };
            const fk = new FieldDecorator('ForeignKey', 'Entity', 'ownerId', {
                target: () => targetEntity,
                onDelete: OnDeleteAction.Restrict,
            });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('assets'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [col] : []),
                getFieldByProperty: (prop) => (prop === 'ownerId' ? [col, fk] : []),
            });
            const definition = new DefinitionBuilder(reader).build();
            const ownerIdColumn = definition.columns.find((c) => c.includes('owner_id'))!;
            expect(ownerIdColumn).toContain('REFERENCES owners(uuid) ON DELETE RESTRICT');
        });

        it('does not add virtual column for non-indexed, non-FK Column fields', () => {
            const pkField = createPrimaryKeyColumnField('id', 'text');
            const nonIndexed = createColumnField('label', { type: 'varchar', index: false });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('tags'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [nonIndexed] : []),
                getFieldByProperty: () => [],
            });
            const definition = new DefinitionBuilder(reader).build();
            expect(definition.columns.filter((c) => c.includes('label'))).toHaveLength(0);
            expect(definition.indexes.some((i) => i.includes('label'))).toBe(false);
        });

        it('adds index for ForeignKey real columns even when Column options.index is false', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const fkColumn = createColumnField('parentId', { type: 'varchar', length: 36, index: false });
            const targetEntity = { entityName: 'parents' };
            const fk = new FieldDecorator('ForeignKey', 'Entity', 'parentId', {
                target: () => targetEntity,
                column: 'uuid',
                onDelete: OnDeleteAction.Restrict,
            });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('children'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [fkColumn] : []),
                getFieldByProperty: (prop) => (prop === 'parentId' ? [fkColumn, fk] : []),
            });
            const definition = new DefinitionBuilder(reader).build();
            const parentCol = definition.columns.find((c) => c.includes('parent_id'))!;
            expect(parentCol).toContain('REFERENCES parents(uuid) ON DELETE RESTRICT');
            expect(definition.indexes.some((i) => i.includes('idx_children_parent_id'))).toBe(true);
        });
    });

    describe('I — Interface (reader contract)', () => {
        it('constructor calls getEntity and getPrimaryKeyColumn exactly once', () => {
            const getEntity = vi.fn(() => createEntityDecorator('t'));
            const getPrimaryKeyColumn = vi.fn(() => createPrimaryKeyColumnField('id', 'text'));
            const reader = createMockReader({
                getEntity,
                getPrimaryKeyColumn,
                getFieldsByDecorator: () => [],
            });
            new DefinitionBuilder(reader);
            expect(getEntity).toHaveBeenCalledTimes(1);
            expect(getPrimaryKeyColumn).toHaveBeenCalledTimes(1);
        });

        it('constructor calls getFieldsByDecorator with "Column"', () => {
            const getFieldsByDecorator = vi.fn(() => []);
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('t'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('id', 'text'),
                getFieldsByDecorator,
            });
            new DefinitionBuilder(reader);
            expect(getFieldsByDecorator).toHaveBeenCalledWith('Column');
        });

        it('build returns same tableName and primaryKeyColumnName as provided by reader', () => {
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('my_custom_table'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('primaryKey', 'varchar', 36),
                getFieldsByDecorator: () => [],
            });
            const definition = new DefinitionBuilder(reader).build();
            expect(definition.tableName).toBe('my_custom_table');
            expect(definition.primaryKeyColumnName).toBe('primary_key');
        });
    });

    describe('E — Exceptions', () => {
        it('constructor throws DatabaseException with code ENTITY_METADATA_REQUIRED when entity is null', () => {
            const reader = createMockReader({
                getEntity: () => undefined as unknown as EntityDecorator,
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('id', 'text'),
            });
            try {
                new DefinitionBuilder(reader);
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('ENTITY_METADATA_REQUIRED');
            }
        });

        it('constructor throws when getPrimaryKeyColumn returns null', () => {
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('t'),
                getPrimaryKeyColumn: () => undefined as unknown as FieldDecorator,
            });
            expect(() => new DefinitionBuilder(reader)).toThrow(DatabaseException);
        });

        it('throws DatabaseException when ForeignKey target has no entityName', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const col = createColumnField('refId', { type: 'varchar', length: 36, index: true });
            const badTarget: unknown = {};
            const fk = new FieldDecorator('ForeignKey', 'Entity', 'refId', {
                target: () => badTarget as { entityName?: string },
                onDelete: OnDeleteAction.Restrict,
            });
            const reader = createMockReader({
                getEntity: () => createEntityDecorator('edges'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [col] : []),
                getFieldByProperty: (prop) => (prop === 'refId' ? [col, fk] : []),
            });
            expect(() => new DefinitionBuilder(reader)).toThrow(DatabaseException);
        });
    });
});
