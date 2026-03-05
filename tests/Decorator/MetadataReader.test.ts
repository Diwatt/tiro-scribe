// Define Symbol.metadata for Stage 3 decorator tests
if (typeof Symbol !== 'undefined' && !Symbol.metadata) {
    // @ts-expect-error polyfill for test environment
    Symbol.metadata = Symbol('metadata');
}

import { ClassDecorator } from '@/Decorator/ClassDecorator';
import { MetadataReader } from '@/Decorator/MetadataReader';
import { MetadataWriter } from '@/Decorator/MetadataWriter';
import type { MetadataConstructor, MetadataMap } from '@/Decorator/Type';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/Service/Logger', () => {
    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
    return {
        AppLogger: {
            getInstance: vi.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

describe('MetadataReader', () => {
    describe('getClass', () => {
        it('returns undefined when constructor has no entity metadata', () => {
            class NoEntity {}
            const construct = NoEntity as unknown as MetadataConstructor;
            const reader = new MetadataReader(construct);
            expect(reader.getClass()).toBeUndefined();
        });

        it('returns ClassDecorator when registered via MetadataWriter', () => {
            class WithEntity {}
            const construct = WithEntity as unknown as MetadataConstructor;
            MetadataWriter.registerClass(construct as unknown as any, { tableName: 'with_entity' });
            const reader = new MetadataReader(construct);
            const cls = reader.getClass();
            expect(cls).toBeInstanceOf(ClassDecorator);
            expect(cls?.getOption('tableName')).toBe('with_entity');
        });
    });

    describe('getProperties', () => {
        it('returns empty array when no Symbol.metadata', () => {
            class NoMeta {}
            const construct = NoMeta as unknown as MetadataConstructor;
            const reader = new MetadataReader(construct);
            expect(reader.getProperties()).toEqual([]);
        });

        it('returns property decorators from Symbol.metadata', () => {
            class WithFields {}
            const construct = WithFields as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'WithFields', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'id', 'PrimaryKey', {});
            MetadataWriter.registerProperty(meta, 'uuid', 'Column', { default: () => 'x' });
            const reader = new MetadataReader(construct);
            const props = reader.getProperties();
            expect(props).toHaveLength(2);
            const byName = (key: string) => props.find((f) => f.getPropertyName() === key)!;
            expect(byName('id').getDecoratorName()).toBe('PrimaryKey');
            expect(byName('uuid').getDecoratorName()).toBe('Column');
            expect(byName('uuid').getClassName()).toBe('WithFields');
        });
    });

    describe('getDecoratorsByProperty', () => {
        it('filters getProperties by property name', () => {
            class Multi {}
            const construct = Multi as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'Multi', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'a', 'Column', {});
            MetadataWriter.registerProperty(meta, 'a', 'PrimaryKey', {});
            MetadataWriter.registerProperty(meta, 'b', 'Column', {});
            const reader = new MetadataReader(construct);
            const forA = reader.getDecoratorsByProperty('a');
            expect(forA).toHaveLength(2);
            expect(forA.every((f) => f.getPropertyName() === 'a')).toBe(true);
        });
    });

    describe('getProperty (instance)', () => {
        it('returns first property with given decorator name', () => {
            class HasPK {}
            const construct = HasPK as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'HasPK', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'pk', 'PrimaryKey', {});
            const reader = new MetadataReader(construct);
            const primaryKeyProperty = reader.getProperty('PrimaryKey');
            expect(primaryKeyProperty).toBeDefined();
            expect(primaryKeyProperty?.getPropertyName()).toBe('pk');
        });

        it('returns undefined when no property has decorator name', () => {
            class NoPK {}
            const construct = NoPK as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'NoPK', configurable: true });
            (construct as any)[Symbol.metadata] = {};
            const reader = new MetadataReader(construct);
            expect(reader.getProperty('PrimaryKey')).toBeUndefined();
        });
    });

    describe('forTarget helper', () => {
        it('returns a reader instance for a constructor', () => {
            class C {}
            const reader = MetadataReader.forTarget(C);
            expect(reader).toBeInstanceOf(MetadataReader);
        });

        it('normalizes an instance to its constructor', () => {
            class C {}
            const inst = new C();
            const reader = MetadataReader.forTarget(inst);
            expect(reader).toBeInstanceOf(MetadataReader);
        });
    });

    describe('getProperty via forTarget', () => {
        it('works with a constructor', () => {
            const construct = function StaticPK() {};
            Object.defineProperty(construct, 'name', { value: 'StaticPK', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'id', 'PrimaryKey', {});
            const primaryKeyProperty = MetadataReader.forTarget(construct).getProperty('PrimaryKey');
            expect(primaryKeyProperty).toBeDefined();
            expect(primaryKeyProperty?.getPropertyName()).toBe('id');
        });

        it('works with an instance', () => {
            const construct = function InstancePK() {};
            Object.defineProperty(construct, 'name', { value: 'InstancePK', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'uuid', 'PrimaryKey', {});
            const instance = Object.create(construct.prototype);
            Object.defineProperty(instance, 'constructor', { value: construct });
            const primaryKeyProperty = MetadataReader.forTarget(instance).getProperty('PrimaryKey');
            expect(primaryKeyProperty).toBeDefined();
            expect(primaryKeyProperty?.getPropertyName()).toBe('uuid');
        });
    });

    describe('helpers for property-level lookup', () => {
        it('can tell when a property has a decorator', () => {
            class A {}
            const construct = A as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'A', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'foo', 'Column', {});
            const reader = new MetadataReader(construct);
            expect(reader.hasDecoratorOnProperty('foo', 'Column')).toBe(true);
            expect(reader.hasDecoratorOnProperty('foo', 'PrimaryKey')).toBe(false);
        });

        it('can fetch a specific decorator from a property', () => {
            class B {}
            const construct = B as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'B', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'bar', 'ForeignKey', { target: () => B });
            const reader = new MetadataReader(construct);
            const dec = reader.getDecoratorFromProperty('bar', 'ForeignKey');
            expect(dec).toBeDefined();
            expect(dec?.getDecoratorName()).toBe('ForeignKey');
        });
    });

    describe('additional helpers and caching', () => {
        it('getPropertiesByDecorator filters decorators correctly', () => {
            class C {}
            const construct = C as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'C', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'a', 'Column', {});
            MetadataWriter.registerProperty(meta, 'b', 'PrimaryKey', {});
            MetadataWriter.registerProperty(meta, 'a', 'PrimaryKey', {});
            const reader = new MetadataReader(construct);
            const cols = reader.getPropertiesByDecorator('Column');
            expect(cols).toHaveLength(1);
            expect(cols[0].getPropertyName()).toBe('a');
        });

        it('getOptionValuesByProperty returns a map of option values', () => {
            class D {}
            const construct = D as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'D', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'x', 'Column', { default: 1 });
            MetadataWriter.registerProperty(meta, 'y', 'Column', { default: () => 2 });
            MetadataWriter.registerProperty(meta, 'z', 'PrimaryKey', {});
            const reader = new MetadataReader(construct);
            const vals = reader.getOptionValuesByProperty('Column', 'default');
            expect(vals).toEqual({ x: 1, y: 2 });
        });

        it('getProperties caches results so repeated calls return same array instance', () => {
            class E {}
            const construct = E as unknown as MetadataConstructor;
            Object.defineProperty(construct, 'name', { value: 'E', configurable: true });
            const meta: MetadataMap = {};
            (construct as any)[Symbol.metadata] = meta;
            MetadataWriter.registerProperty(meta, 'p', 'Column', {});
            const reader = new MetadataReader(construct);
            const first = reader.getProperties();
            const second = reader.getProperties();
            expect(first).toBe(second);
        });
    });
});
