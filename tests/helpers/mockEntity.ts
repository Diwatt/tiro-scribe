/**
 * Builds entity constructors with manual metadata so tests don't load decorated
 * entities (which require Stage 3 decorators / addInitializer in the test runner).
 */

import { randomUUID } from 'node:crypto';
import { AbstractEntity } from '@/Database/AbstractEntity';
import { ClassDecorator } from '@/Decorator/ClassDecorator';
import { MetadataWriter } from '@/Decorator/MetadataWriter';


import type { MetadataMap } from '@/Decorator/Type';

type FieldMeta = MetadataMap;

type Constructor = new (...args: unknown[]) => unknown;

function attachEntityMetadata(ctor: Constructor, tableName: string, fieldMeta: FieldMeta): void {
    MetadataWriter.classMetadataMap.set(ctor, { tableName });
    (ctor as unknown as Record<symbol, unknown>)[Symbol.metadata] = fieldMeta;
}

/** Minimal encounter-like constructor for RecordNormalizer/Registry/Repository tests. */
export function createMockEncounterConstructor(): (new (...args: unknown[]) => Entity) & {
    entityName: string;
    name: string;
} {
    class MockEncounter extends AbstractEntity {}
    (MockEncounter as unknown as { entityName: string }).entityName = 'encounters';
    attachEntityMetadata(
        MockEncounter,
        'encounters',
        {
            uuid: {
                decorators: [
                    { decoratorName: 'PrimaryKey', options: {} },
                    { decoratorName: 'Column', options: { default: () => randomUUID(), type: 'text' } },
                ],
            },
            therapistId: { decorators: [{ decoratorName: 'Column', options: { default: '', type: 'text' } }] },
            participantBiocodes: { decorators: [{ decoratorName: 'Column', options: { default: [], type: 'text' } }] },
            status: { decorators: [{ decoratorName: 'Column', options: { default: 'recording', type: 'text' } }] },
        },
    );
    return MockEncounter as unknown as (new (...args: unknown[]) => Entity) & { entityName: string; name: string };
}

/** Entity with PrimaryKey for AbstractEntity tests. */
export function createTestEntityConstructor(): (new (...args: unknown[]) => Entity) & {
    entityName: string;
    name: string;
} {
    class TestEntity extends AbstractEntity {}
    (TestEntity as unknown as { entityName: string }).entityName = 'test_entities';
    attachEntityMetadata(
        TestEntity,
        'test_entities',
        {
            id: {
                decorators: [
                    { decoratorName: 'PrimaryKey', options: {} },
                    { decoratorName: 'Column', options: { default: () => 'test-primary-key-1', type: 'text' } },
                ],
            },
            name: { decorators: [{ decoratorName: 'Column', options: { default: '', type: 'text' } }] },
        },
    );
    return TestEntity as unknown as (new (...args: unknown[]) => Entity) & { entityName: string; name: string };
}

/** Entity without PrimaryKey for PRIMARY_KEY_NOT_DEFINED test. */
export function createNoPkEntityConstructor(): (new (...args: unknown[]) => Entity) & {
    entityName: string;
    name: string;
} {
    class NoPkEntity extends AbstractEntity {}
    (NoPkEntity as unknown as { entityName: string }).entityName = 'no_pk_entities';
    attachEntityMetadata(NoPkEntity, 'no_pk_entities', {
        x: { decorators: [{ decoratorName: 'Column', options: { default: '', type: 'text' } }] },
    }); // no primaryKey = tests PRIMARY_KEY_NOT_DEFINED
    return NoPkEntity as unknown as (new (...args: unknown[]) => Entity) & { entityName: string; name: string };
}
