/**
 * Builds entity constructors with manual metadata so tests don't load decorated
 * entities (which require Stage 3 decorators / addInitializer in the test runner).
 */

import { randomUUID } from 'node:crypto';
import type { EntityConstructorInput } from '@/Database/AbstractEntity';
import { AbstractEntity } from '@/Database/AbstractEntity';
import { EntityDecorator } from '@/Decorator/EntityDecorator';
import { MetadataWriter } from '@/Decorator/MetadataWriter';

const ENTITY_KEY = MetadataWriter.ENTITY_METADATA_KEY;

type FieldMeta = Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }>;

function attachEntityMetadata(ctor: Function, tableName: string, fieldMeta: FieldMeta): void {
    (ctor as unknown as Record<string, unknown>)[ENTITY_KEY] = new EntityDecorator('Entity', { table_name: tableName });
    (ctor as unknown as Record<symbol, unknown>)[Symbol.metadata] = fieldMeta;
}

/** Minimal encounter-like constructor for Serializer/Registry/Repository tests. */
export function createMockEncounterConstructor(): typeof AbstractEntity & {
    entityName: string;
    name: string;
} {
    class MockEncounter extends AbstractEntity {}
    (MockEncounter as unknown as { entityName: string }).entityName = 'encounters';
    attachEntityMetadata(MockEncounter, 'encounters', {
        uuid: {
            decorators: [
                { decoratorName: 'PrimaryKey', options: {} },
                { decoratorName: 'Column', options: { default: () => randomUUID() } },
            ],
        },
        therapistId: { decorators: [{ decoratorName: 'Column', options: { default: '' } }] },
        participantBiocodes: { decorators: [{ decoratorName: 'Column', options: { default: [] } }] },
        status: { decorators: [{ decoratorName: 'Column', options: { default: 'recording' } }] },
    });
    return MockEncounter as unknown as typeof AbstractEntity & { entityName: string; name: string };
}

/** Entity with PrimaryKey for AbstractEntity tests. */
export function createTestEntityConstructor(): typeof AbstractEntity & {
    entityName: string;
    name: string;
} {
    class TestEntity extends AbstractEntity {}
    (TestEntity as unknown as { entityName: string }).entityName = 'test_entities';
    attachEntityMetadata(TestEntity, 'test_entities', {
        id: {
            decorators: [
                { decoratorName: 'PrimaryKey', options: {} },
                { decoratorName: 'Column', options: { default: () => 'test-pk-1' } },
            ],
        },
        name: { decorators: [{ decoratorName: 'Column', options: { default: '' } }] },
    });
    return TestEntity as unknown as typeof AbstractEntity & { entityName: string; name: string };
}

/** Entity without PrimaryKey for PRIMARY_KEY_NOT_DEFINED test. */
export function createNoPkEntityConstructor(): typeof AbstractEntity & {
    entityName: string;
    name: string;
} {
    class NoPkEntity extends AbstractEntity {}
    (NoPkEntity as unknown as { entityName: string }).entityName = 'no_pk_entities';
    attachEntityMetadata(NoPkEntity, 'no_pk_entities', {
        x: { decorators: [{ decoratorName: 'Column', options: { default: '' } }] },
    });
    return NoPkEntity as unknown as typeof AbstractEntity & { entityName: string; name: string };
}
