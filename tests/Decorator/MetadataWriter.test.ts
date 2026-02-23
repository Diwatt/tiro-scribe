// Set global __DEV__ variable for tests
// @ts-expect-error allow setting global for test
global.__DEV__ = true;

import { ClassDecorator as EntityDecorator } from '@/Decorator/ClassDecorator';
import { MetadataWriter } from '@/Decorator/MetadataWriter';

describe('MetadataWriter', () => {
    it('ENTITY_METADATA_KEY is a well-known string', () => {
        expect(MetadataWriter.ENTITY_METADATA_KEY).toBe('__entityMetadata');
    });

    it('registerEntity stores EntityDecorator on constructor', () => {
        class MockEntity {}
        const construct = MockEntity;
        const options = { tableName: 'mock_entities' };
        MetadataWriter.registerEntity(construct, options);
        const stored = (construct as unknown as Record<string, unknown>)[MetadataWriter.ENTITY_METADATA_KEY];
        expect(stored).toBeInstanceOf(EntityDecorator);
        expect((stored as EntityDecorator).getOption('tableName')).toBe('mock_entities');
    });

    it('registerField appends to metadata.decorators for property', () => {
        const meta: Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }> = {};
        MetadataWriter.registerField(meta, 'id', 'PrimaryKey', {});
        expect(meta.id).toBeDefined();
        expect(meta.id?.decorators).toHaveLength(1);
        expect(meta.id?.decorators?.[0]).toEqual({ decoratorName: 'PrimaryKey', options: {} });
    });

    it('registerField appends when property already has decorators', () => {
        const meta: Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }> = {
            uuid: { decorators: [{ decoratorName: 'Column', options: { default: 1 } }] },
        };
        MetadataWriter.registerField(meta, 'uuid', 'PrimaryKey', {});
        expect(meta.uuid?.decorators).toHaveLength(2);
        expect(meta.uuid?.decorators?.[1]).toEqual({ decoratorName: 'PrimaryKey', options: {} });
    });

    it('registerField does nothing when meta is null', () => {
        expect(() => MetadataWriter.registerField(null, 'x', 'Column', {})).not.toThrow();
    });

    it('registerField does nothing when meta is undefined', () => {
        expect(() => MetadataWriter.registerField(undefined, 'x', 'Column', {})).not.toThrow();
    });

    it('registerField does nothing when meta is not an object', () => {
        expect(() => MetadataWriter.registerField('not-object' as any, 'x', 'Column', {})).not.toThrow();
    });
});
