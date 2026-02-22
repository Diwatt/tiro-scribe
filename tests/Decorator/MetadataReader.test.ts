// Set global __DEV__ variable for tests
// @ts-expect-error allow setting global for test
global.__DEV__ = true;

// Define Symbol.metadata for Stage 3 decorator tests
if (typeof Symbol !== 'undefined' && !Symbol.metadata) {
    // @ts-expect-error polyfill for test environment
    Symbol.metadata = Symbol('metadata');
}

import { EntityDecorator } from '@/Decorator/EntityDecorator';
import { MetadataReader } from '@/Decorator/MetadataReader';
import { MetadataWriter } from '@/Decorator/MetadataWriter';
import type { ClassConstructor, MetadataConstructor } from '@/Decorator/Type';

describe('MetadataReader', () => {
    describe('getEntity', () => {
        it('returns undefined when constructor has no entity metadata', () => {
            class NoEntity {}
            const construct = NoEntity as unknown as MetadataConstructor;
            const reader = new MetadataReader(construct);
            expect(reader.getEntity()).toBeUndefined();
        });

        it('returns EntityDecorator when registered via MetadataWriter', () => {
            class WithEntity {}
            const construct = WithEntity as unknown as MetadataConstructor;
            MetadataWriter.registerEntity(construct as unknown as ClassConstructor, { tableName: 'with_entity' });
            const reader = new MetadataReader(construct);
            const entity = reader.getEntity();
            expect(entity).toBeInstanceOf(EntityDecorator);
            expect(entity?.getEntityName()).toBe('with_entity');
        });
    });

    describe('getFields', () => {
        it('returns empty array when no Symbol.metadata', () => {
            class NoMeta {}
            const construct = NoMeta as unknown as MetadataConstructor;
            const reader = new MetadataReader(construct);
            expect(reader.getFields()).toEqual([]);
        });

        it('returns field decorators from Symbol.metadata', () => {
            class WithFields {}
            const construct = WithFields as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'WithFields', configurable: true });
            const meta: Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }> = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerField(meta, 'id', 'PrimaryKey', {});
            MetadataWriter.registerField(meta, 'uuid', 'Column', { default: () => 'x' });
            const reader = new MetadataReader(construct);
            const fields = reader.getFields();
            expect(fields).toHaveLength(2);
            const byName = (key: string) => fields.find((f) => f.getFieldName() === key)!;
            expect(byName('id').getDecoratorName()).toBe('PrimaryKey');
            expect(byName('uuid').getDecoratorName()).toBe('Column');
            expect(byName('uuid').getEntityName()).toBe('WithFields');
        });
    });

    describe('getFieldByProperty', () => {
        it('filters getFields by property name', () => {
            class Multi {}
            const construct = Multi as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'Multi', configurable: true });
            const meta: Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }> = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerField(meta, 'a', 'Column', {});
            MetadataWriter.registerField(meta, 'a', 'PrimaryKey', {});
            MetadataWriter.registerField(meta, 'b', 'Column', {});
            const reader = new MetadataReader(construct);
            const forA = reader.getFieldByProperty('a');
            expect(forA).toHaveLength(2);
            expect(forA.every((f) => f.getFieldName() === 'a')).toBe(true);
        });
    });

    describe('getField (instance)', () => {
        it('returns first field with given decorator name', () => {
            class HasPK {}
            const construct = HasPK as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'HasPK', configurable: true });
            const meta: Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }> = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerField(meta, 'pk', 'PrimaryKey', {});
            const reader = new MetadataReader(construct);
            const primaryKeyField = reader.getField('PrimaryKey');
            expect(primaryKeyField).toBeDefined();
            expect(primaryKeyField?.getFieldName()).toBe('pk');
        });

        it('returns undefined when no field has decorator name', () => {
            class NoPK {}
            const construct = NoPK as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'NoPK', configurable: true });
            (construct as any)[Symbol.metadata] = {};
            const reader = new MetadataReader(construct);
            expect(reader.getField('PrimaryKey')).toBeUndefined();
        });
    });

    describe('getField (static)', () => {
        it('accepts constructor and returns field by decorator name', () => {
            const construct = function StaticPK() {};
            Object.defineProperty(construct, 'name', { value: 'StaticPK', configurable: true });
            const meta: Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }> = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerField(meta, 'id', 'PrimaryKey', {});
            const primaryKeyField = MetadataReader.getField(construct, 'PrimaryKey');
            expect(primaryKeyField).toBeDefined();
            expect(primaryKeyField?.getFieldName()).toBe('id');
        });

        it('accepts instance and uses instance.constructor', () => {
            const construct = function InstancePK() {};
            Object.defineProperty(construct, 'name', { value: 'InstancePK', configurable: true });
            const meta: Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }> = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerField(meta, 'uuid', 'PrimaryKey', {});
            const instance = Object.create(construct.prototype);
            Object.defineProperty(instance, 'constructor', { value: construct });
            const primaryKeyField = MetadataReader.getField(instance, 'PrimaryKey');
            expect(primaryKeyField).toBeDefined();
            expect(primaryKeyField?.getFieldName()).toBe('uuid');
        });
    });
});
