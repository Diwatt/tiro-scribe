/**
 * Builds entity constructors with manual metadata so tests don't load decorated
 * entities (which require Stage 3 decorators / addInitializer in Jest).
 */

import { AbstractEntity } from '@/Database/AbstractEntity';
import type { EntityConstructorInput } from '@/Database/AbstractEntity';
import { MetadataWriter } from '@/Decorator/MetadataWriter';
import { EntityDecorator } from '@/Decorator/EntityDecorator';

const ENTITY_KEY = MetadataWriter.ENTITY_METADATA_KEY;

type FieldMeta = Record<string, { decorators: Array<{ decoratorName: string; options: unknown }> }>;

function attachEntityMetadata(
    ctor: Function,
    tableName: string,
    fieldMeta: FieldMeta,
): void {
    (ctor as unknown as Record<string, unknown>)[ENTITY_KEY] = new EntityDecorator(
        'Entity',
        { table_name: tableName },
    );
    (ctor as unknown as Record<symbol, unknown>)[Symbol.metadata] = fieldMeta;
}

/** Minimal encounter-like constructor for Serializer/Registry/Repository tests. */
export function createMockEncounterConstructor(): typeof AbstractEntity & {
    entityName: string;
    name: string;
} {
    const M = function MockEncounter(this: AbstractEntity, data?: EntityConstructorInput) {
        AbstractEntity.call(this as unknown as AbstractEntity, data);
    } as unknown as typeof AbstractEntity & { entityName: string; name: string };
    M.prototype = Object.create(AbstractEntity.prototype);
    M.prototype.constructor = M;
    M.name = 'MockEncounter';
    M.entityName = 'encounters';
    attachEntityMetadata(M, 'encounters', {
        uuid: {
            decorators: [
                { decoratorName: 'PrimaryKey', options: {} },
                { decoratorName: 'Column', options: { default: () => crypto.randomUUID() } },
            ],
        },
        therapistId: { decorators: [{ decoratorName: 'Column', options: { default: '' } }] },
        participantBiocodes: { decorators: [{ decoratorName: 'Column', options: { default: [] } }] },
        status: { decorators: [{ decoratorName: 'Column', options: { default: 'RECORDING' } }] },
    });
    return M;
}

/** Entity with PrimaryKey for AbstractEntity tests. */
export function createTestEntityConstructor(): typeof AbstractEntity & {
    entityName: string;
    name: string;
} {
    const M = function TestEntity(this: AbstractEntity, data?: EntityConstructorInput) {
        AbstractEntity.call(this as unknown as AbstractEntity, data);
    } as unknown as typeof AbstractEntity & { entityName: string; name: string };
    M.prototype = Object.create(AbstractEntity.prototype);
    M.prototype.constructor = M;
    M.name = 'TestEntity';
    M.entityName = 'test_entities';
    attachEntityMetadata(M, 'test_entities', {
        id: {
            decorators: [
                { decoratorName: 'PrimaryKey', options: {} },
                { decoratorName: 'Column', options: { default: () => 'test-pk-1' } },
            ],
        },
        name: { decorators: [{ decoratorName: 'Column', options: { default: '' } }] },
    });
    return M;
}

/** Entity without PrimaryKey for PRIMARY_KEY_NOT_DEFINED test. */
export function createNoPkEntityConstructor(): typeof AbstractEntity & {
    entityName: string;
    name: string;
} {
    const M = function NoPkEntity(this: AbstractEntity, data?: EntityConstructorInput) {
        AbstractEntity.call(this as unknown as AbstractEntity, data);
    } as unknown as typeof AbstractEntity & { entityName: string; name: string };
    M.prototype = Object.create(AbstractEntity.prototype);
    M.prototype.constructor = M;
    M.name = 'NoPkEntity';
    M.entityName = 'no_pk_entities';
    attachEntityMetadata(M, 'no_pk_entities', {
        x: { decorators: [{ decoratorName: 'Column', options: { default: '' } }] },
    });
    return M;
}
