// Set global __DEV__ variable for tests
// @ts-expect-error allow setting global for test
global.__DEV__ = true;

import { ClassDecorator } from '@/Decorator/ClassDecorator';
import { MetadataWriter } from '@/Decorator/MetadataWriter';
import { MetadataReader } from '@/Decorator/MetadataReader';
import type { MetadataMap } from '@/Decorator/Type';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/Service/Logger', () => ({
    appLogger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('MetadataWriter', () => {

    it('registerClass stores options in weak map and reader wraps to ClassDecorator', () => {
        class MockEntity {}
        const construct = MockEntity;
        const options = { tableName: 'mock_entities' };
        MetadataWriter.registerClass(construct, options);

        // weak map should contain raw options
        const raw = MetadataWriter.classMetadataMap.get(construct as object);
        expect(raw).toEqual(options);

        // reader should return a wrapped ClassDecorator
        const reader = new MetadataReader(construct as any);
        const stored = reader.getClass();
        expect(stored).toBeInstanceOf(ClassDecorator);
        expect(stored?.getOption('tableName')).toBe('mock_entities');
    });

    it('registerProperty appends to metadata.decorators for property', () => {
        const meta: MetadataMap = {};
        MetadataWriter.registerProperty(meta, 'id', 'PrimaryKey', {});
        expect(meta.id).toBeDefined();
        expect(meta.id?.decorators).toHaveLength(1);
        expect(meta.id?.decorators?.[0]).toEqual({ decoratorName: 'PrimaryKey', options: {} });
    });

    it('registerProperty appends when property already has decorators', () => {
        const meta: MetadataMap = {
            uuid: { decorators: [{ decoratorName: 'Column', options: { default: 1 } }] },
        };
        MetadataWriter.registerProperty(meta, 'uuid', 'PrimaryKey', {});
        expect(meta.uuid?.decorators).toHaveLength(2);
        expect(meta.uuid?.decorators?.[1]).toEqual({ decoratorName: 'PrimaryKey', options: {} });
    });

    it('registerProperty does nothing when meta is null', () => {
        expect(() => MetadataWriter.registerProperty(null, 'x', 'Column', {})).not.toThrow();
    });

    it('registerProperty does nothing when meta is undefined', () => {
        expect(() => MetadataWriter.registerProperty(undefined, 'x', 'Column', {})).not.toThrow();
    });

    it('registerProperty does nothing when meta is not an object', () => {
        expect(() => MetadataWriter.registerProperty('not-object' as any, 'x', 'Column', {})).not.toThrow();
    });
});
