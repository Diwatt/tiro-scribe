/**
 * DefinitionBuilder tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: DefinitionBuilder. All dependencies (EntityMetadata) are mocked.
 */

import { ClassDecorator as EntityDecorator } from '@/Decorator/ClassDecorator';
import { PropertyDecorator } from '@/Decorator/PropertyDecorator';
import type { EntityMetadata } from '@/Database/Decorator';
import { DefinitionBuilder } from '@/Database/Schema/DefinitionBuilder';
import { OnDeleteAction } from '@/Database/Decorator';
import type { ForeignKeyOptions } from '@/Database/Decorator';
import type { EntityClass } from '@/Database/Type';
import { DatabaseException } from '@/Exception';
import { TableDefinition } from '@/Database/Schema/TableDefinition';
import { describe, it, expect, vi } from 'vitest';

function createMockMetadata(overrides: {
    getTableName?: () => string;
    getPrimaryKeyColumnField?: () => PropertyDecorator | undefined;
    getColumnFields?: () => PropertyDecorator[];
    getForeignKeyOptions?: (propertyName: string) => ForeignKeyOptions | undefined;
    getForeignKeyTargetTableName?: (propertyName: string) => string | null;
}): EntityMetadata {
    return {
        getTableName: overrides.getTableName ?? vi.fn(),
        getPrimaryKeyColumnField: overrides.getPrimaryKeyColumnField ?? vi.fn(),
        getColumnFields: overrides.getColumnFields ?? vi.fn(() => []),
        getForeignKeyOptions: overrides.getForeignKeyOptions ?? vi.fn(() => undefined),
        getForeignKeyTargetTableName: overrides.getForeignKeyTargetTableName ?? vi.fn(() => null),
    } as unknown as EntityMetadata;
}

function metadataFromReaderLike(readerLike: {
    getEntity?: () => EntityDecorator | undefined;
    getPrimaryKeyColumn?: () => PropertyDecorator | undefined;
    getFieldsByDecorator?: (name: string) => PropertyDecorator[];
    getFieldByProperty?: (propertyName: string) => PropertyDecorator[];
}): EntityMetadata {
    return createMockMetadata({
        getTableName: () => readerLike.getEntity?.()?.getOption('tableName') ?? '',
        getPrimaryKeyColumnField: readerLike.getPrimaryKeyColumn,
        getColumnFields: () => readerLike.getFieldsByDecorator?.('Column') ?? [],
        getForeignKeyOptions: (prop) => {
            const decorators = readerLike.getFieldByProperty?.(prop) ?? [];
            const fk = decorators.find((d) => d.getDecoratorName() === 'ForeignKey');
            return fk?.getOptions<ForeignKeyOptions>();
        },
        getForeignKeyTargetTableName: (prop) => {
            const opts = (() => {
                const decorators = readerLike.getFieldByProperty?.(prop) ?? [];
                const fk = decorators.find((d) => d.getDecoratorName() === 'ForeignKey');
                return fk?.getOptions<ForeignKeyOptions>();
            })();
            if (opts == null) {
                return null;
            }
            const target = typeof opts.target === 'function' ? (opts.target as () => EntityClass)() : opts.target;
            const table = (target as { entityName?: string })?.entityName;
            return table != null && String(table).trim() !== '' ? table : null;
        },
    });
}

function createEntityDecorator(tableName: string): EntityDecorator {
    return new EntityDecorator('Entity', { tableName });
}

function createPrimaryKeyColumnField(propertyName: string, type: string, length?: number): PropertyDecorator {
    return new PropertyDecorator('Column', 'TestEntity', propertyName, { type, length, default: '' });
}

function createColumnField(
    propertyName: string,
    options: { type: string; length?: number; index?: boolean; fullText?: boolean; fullTextPath?: string },
): PropertyDecorator {
    return new PropertyDecorator('Column', 'TestEntity', propertyName, { default: '', ...options });
}

describe('DefinitionBuilder', () => {
    describe('Z — Zero (missing / null inputs)', () => {
        it('throws DatabaseException with code ENTITY_METADATA_REQUIRED when getTableName would be empty', () => {
            const metadata = createMockMetadata({
                getTableName: () => {
                    throw new DatabaseException('Entity must have @Entity.', 'ENTITY_METADATA_REQUIRED', undefined);
                },
                getPrimaryKeyColumnField: () => createPrimaryKeyColumnField('uuid', 'varchar', 36),
            });
            try {
                new DefinitionBuilder(metadata);
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('ENTITY_METADATA_REQUIRED');
            }
        });

        it('throws DatabaseException with code ENTITY_METADATA_REQUIRED when getPrimaryKeyColumnField returns undefined', () => {
            const metadata = createMockMetadata({
                getTableName: () => 'my_table',
                getPrimaryKeyColumnField: () => undefined,
            });
            try {
                new DefinitionBuilder(metadata);
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('ENTITY_METADATA_REQUIRED');
            }
        });

        it('throws when getPrimaryKeyColumnField is undefined', () => {
            const metadata = createMockMetadata({
                getTableName: () => 't',
                getPrimaryKeyColumnField: () => undefined,
            });
            expect(() => new DefinitionBuilder(metadata)).toThrow(DatabaseException);
        });
    });

    describe('O — One (minimal happy path)', () => {
        it('build returns TableDefinition with tableName and primary key column when one entity and one primary key column', () => {
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('uuid', 'varchar', 36),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(metadata);
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
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('my_entities'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('primaryKeyId', 'varchar', 36),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(metadata);
            const definition = builder.build();
            expect(definition.primaryKeyColumnName).toBe('primary_key_id');
            expect(definition.columns[0]).toContain('primary_key_id');
        });

        it('adds REFERENCES clause and ON DELETE action for ForeignKey on primary key', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const targetEntity = { entityName: 'parents' };
            const fkOnPk = new PropertyDecorator('ForeignKey', 'Entity', 'uuid', {
                target: () => targetEntity,
                column: 'uuid',
                onDelete: OnDeleteAction.Cascade,
            });
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('children'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: () => [],
                getFieldByProperty: (prop) => (prop === 'uuid' ? [pkField, fkOnPk] : []),
            });
            const definition = new DefinitionBuilder(metadata).build();
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
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('encounters'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [indexedA, indexedB, notIndexed] : []),
            });
            const builder = new DefinitionBuilder(metadata);
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
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('encounters'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [ftsField] : []),
            });
            const builder = new DefinitionBuilder(metadata);
            const definition = builder.build();
            expect(definition.fullTextSearchFields).toHaveLength(1);
            expect(definition.fullTextSearchFields[0].name).toBe('transcript');
            expect(definition.fullTextSearchFields[0].jsonPath).toBe('$.text');
        });

        it('build emits real column (not VIRTUAL) with REFERENCES for Column with ForeignKey', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const therapistIdField = createColumnField('therapistId', { type: 'varchar', length: 36, index: true });
            const targetEntity = { entityName: 'therapists' };
            const fkField = new PropertyDecorator('ForeignKey', 'Encounter', 'therapistId', {
                target: () => targetEntity,
                column: 'uuid',
                onDelete: OnDeleteAction.Restrict,
            });
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('encounters'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) =>
                    name === 'Column' ? [therapistIdField] : [],
                getFieldByProperty: (prop) =>
                    prop === 'therapistId' ? [therapistIdField, fkField] : [],
            });
            const builder = new DefinitionBuilder(metadata);
            const definition = builder.build();
            const therapistIdColumn = definition.columns.find((c) => c.includes('therapist_id') && c.includes('REFERENCES'));
            expect(therapistIdColumn).toBeDefined();
            expect(therapistIdColumn).toContain('REFERENCES therapists(uuid) ON DELETE RESTRICT');
            expect(therapistIdColumn).not.toContain('VIRTUAL');
        });
    });

    describe('B — Boundary', () => {
        it('build with primary key type without length does not append length in SQL type', () => {
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('id', 'text'),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(metadata);
            const definition = builder.build();
            expect(definition.columns[0]).toBe('id TEXT PRIMARY KEY');
        });

        it('build with VARCHAR and length 1 uses VARCHAR(1)', () => {
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('code', 'varchar', 1),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(metadata);
            const definition = builder.build();
            expect(definition.columns[0]).toContain('VARCHAR(1)');
        });


        it('excludes primary key property from column fields when building indexed columns', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const otherColumn = createColumnField('name', { type: 'varchar', index: true });
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('items'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [otherColumn] : []),
            });
            const builder = new DefinitionBuilder(metadata);
            const definition = builder.build();
            expect(definition.columns.filter((c) => c.includes('uuid') && c.includes('PRIMARY KEY'))).toHaveLength(1);
            expect(definition.columns.filter((c) => c.includes('name') || c.includes('uuid'))).toHaveLength(2);
        });

        it("defaults ForeignKey referenced column to 'uuid' when not provided", () => {
            const pkField = createPrimaryKeyColumnField('id', 'text');
            const col = createColumnField('ownerId', { type: 'varchar', length: 36, index: true });
            const targetEntity = { entityName: 'owners' };
            const foreignKeyDecorator = new PropertyDecorator('ForeignKey', 'Entity', 'ownerId', {
                target: () => targetEntity,
                onDelete: OnDeleteAction.Restrict,
            });
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('assets'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [col] : []),
                getFieldByProperty: (prop) => (prop === 'ownerId' ? [col, foreignKeyDecorator] : []),
            });
            const definition = new DefinitionBuilder(metadata).build();
            const ownerIdColumn = definition.columns.find((c) => c.includes('owner_id'))!;
            expect(ownerIdColumn).toContain('REFERENCES owners(uuid) ON DELETE RESTRICT');
        });

        it('does not add virtual column for non-indexed, non-FK Column fields', () => {
            const pkField = createPrimaryKeyColumnField('id', 'text');
            const nonIndexed = createColumnField('label', { type: 'varchar', index: false });
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('tags'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [nonIndexed] : []),
                getFieldByProperty: () => [],
            });
            const definition = new DefinitionBuilder(metadata).build();
            expect(definition.columns.filter((c) => c.includes('label'))).toHaveLength(0);
            expect(definition.indexes.some((i) => i.includes('label'))).toBe(false);
        });

        it('adds index for ForeignKey real columns even when Column options.index is false', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const fkColumn = createColumnField('parentId', { type: 'varchar', length: 36, index: false });
            const targetEntity = { entityName: 'parents' };
            const foreignKeyDecorator = new PropertyDecorator('ForeignKey', 'Entity', 'parentId', {
                target: () => targetEntity,
                column: 'uuid',
                onDelete: OnDeleteAction.Restrict,
            });
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('children'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [fkColumn] : []),
                getFieldByProperty: (prop) => (prop === 'parentId' ? [fkColumn, foreignKeyDecorator] : []),
            });
            const definition = new DefinitionBuilder(metadata).build();
            const parentCol = definition.columns.find((c) => c.includes('parent_id'))!;
            expect(parentCol).toContain('REFERENCES parents(uuid) ON DELETE RESTRICT');
            expect(definition.indexes.some((i) => i.includes('idx_children_parent_id'))).toBe(true);
        });
    });

    describe('I — Interface (reader contract)', () => {
        it('constructor calls getEntity and getPrimaryKeyColumn exactly once', () => {
            const getEntity = vi.fn(() => createEntityDecorator('t'));
            const getPrimaryKeyColumn = vi.fn(() => createPrimaryKeyColumnField('id', 'text'));
            const metadata = metadataFromReaderLike({
                getEntity,
                getPrimaryKeyColumn,
                getFieldsByDecorator: () => [],
            });
            new DefinitionBuilder(metadata);
            expect(getEntity).toHaveBeenCalledTimes(1);
            expect(getPrimaryKeyColumn).toHaveBeenCalledTimes(1);
        });

        it('constructor calls getFieldsByDecorator with "Column"', () => {
            const getFieldsByDecorator = vi.fn(() => []);
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('t'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('id', 'text'),
                getFieldsByDecorator,
            });
            new DefinitionBuilder(metadata);
            expect(getFieldsByDecorator).toHaveBeenCalledWith('Column');
        });

        it('build returns same tableName and primaryKeyColumnName as provided by metadata', () => {
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('my_custom_table'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('primaryKey', 'varchar', 36),
                getFieldsByDecorator: () => [],
            });
            const definition = new DefinitionBuilder(metadata).build();
            expect(definition.tableName).toBe('my_custom_table');
            expect(definition.primaryKeyColumnName).toBe('primary_key');
        });
    });

    describe('S — Simple', () => {
        it('building with minimal metadata returns a TableDefinition', () => {
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('foo'),
                getPrimaryKeyColumn: () => createPrimaryKeyColumnField('id', 'text'),
                getFieldsByDecorator: () => [],
            });
            const builder = new DefinitionBuilder(metadata);
            const def = builder.build();
            expect(def).toBeInstanceOf(TableDefinition);
        });
    });

    describe('E — Exceptions', () => {
        it('constructor propagates DatabaseException when getTableName throws ENTITY_METADATA_REQUIRED', () => {
            const metadata = createMockMetadata({
                getTableName: () => {
                    throw new DatabaseException('Not an @Entity.', 'ENTITY_METADATA_REQUIRED', undefined);
                },
                getPrimaryKeyColumnField: () => createPrimaryKeyColumnField('id', 'text'),
            });
            try {
                new DefinitionBuilder(metadata);
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('ENTITY_METADATA_REQUIRED');
            }
        });

        it('constructor throws when getPrimaryKeyColumn returns null', () => {
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('t'),
                getPrimaryKeyColumn: () => undefined as unknown as PropertyDecorator,
            });
            expect(() => new DefinitionBuilder(metadata)).toThrow(DatabaseException);
        });

        it('throws DatabaseException when ForeignKey target has no entityName', () => {
            const pkField = createPrimaryKeyColumnField('uuid', 'varchar', 36);
            const col = createColumnField('refId', { type: 'varchar', length: 36, index: true });
            const badTarget: unknown = {};
            const foreignKeyDecorator = new PropertyDecorator('ForeignKey', 'Entity', 'refId', {
                target: () => badTarget as { entityName?: string },
                onDelete: OnDeleteAction.Restrict,
            });
            const metadata = metadataFromReaderLike({
                getEntity: () => createEntityDecorator('edges'),
                getPrimaryKeyColumn: () => pkField,
                getFieldsByDecorator: (name) => (name === 'Column' ? [col] : []),
                getFieldByProperty: (prop) => (prop === 'refId' ? [col, foreignKeyDecorator] : []),
            });
            expect(() => new DefinitionBuilder(metadata)).toThrow(DatabaseException);
        });
    });
});
