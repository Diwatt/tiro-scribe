import { MetadataReader } from '@/Decorator/MetadataReader';
import { MetadataWriter } from '@/Decorator/MetadataWriter';
import { EntityDecorator } from '@/Decorator/EntityDecorator';

describe('MetadataReader', () => {
    describe('getEntity', () => {
        it('returns undefined when constructor has no entity metadata', () => {
            const construct = function NoEntity() {};
            const reader = new MetadataReader(construct);
            expect(reader.getEntity()).toBeUndefined();
        });

        it('returns EntityDecorator when registered via MetadataWriter', () => {
            const construct = function WithEntity() {};
            MetadataWriter.registerEntity(construct, { table_name: 'with_entity' });
            const reader = new MetadataReader(construct);
            const entity = reader.getEntity();
            expect(entity).toBeInstanceOf(EntityDecorator);
            expect(entity!.getEntityName()).toBe('with_entity');
        });
    });

    describe('getFields', () => {
        it('returns empty array when no Symbol.metadata', () => {
            const construct = function NoMeta() {};
            const reader = new MetadataReader(construct);
            expect(reader.getFields()).toEqual([]);
        });

        it('returns field decorators from Symbol.metadata', () => {
            const construct = function WithFields() {};
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
            const construct = function Multi() {};
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
            const construct = function HasPK() {};
            Object.defineProperty(construct, 'name', { value: 'HasPK', configurable: true });
            const meta: Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }> = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerField(meta, 'pk', 'PrimaryKey', {});
            const reader = new MetadataReader(construct);
            const pk = reader.getField('PrimaryKey');
            expect(pk).toBeDefined();
            expect(pk!.getFieldName()).toBe('pk');
        });

        it('returns undefined when no field has decorator name', () => {
            const construct = function NoPK() {};
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
            const pk = MetadataReader.getField(construct, 'PrimaryKey');
            expect(pk).toBeDefined();
            expect(pk!.getFieldName()).toBe('id');
        });

        it('accepts instance and uses instance.constructor', () => {
            const construct = function InstancePK() {};
            Object.defineProperty(construct, 'name', { value: 'InstancePK', configurable: true });
            const meta: Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }> = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerField(meta, 'uuid', 'PrimaryKey', {});
            const instance = Object.create(construct.prototype);
            Object.defineProperty(instance, 'constructor', { value: construct });
            const pk = MetadataReader.getField(instance, 'PrimaryKey');
            expect(pk).toBeDefined();
            expect(pk!.getFieldName()).toBe('uuid');
        });
    });
});
