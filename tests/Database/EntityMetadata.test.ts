import { EntityMetadata } from '@/Database/Decorator';
import { ClassDecorator } from '@/Decorator/ClassDecorator';
import { MetadataWriter } from '@/Decorator/MetadataWriter';
import type { MetadataConstructor } from '@/Decorator/Type';

interface DecoratorEntry {
    decoratorName: string;
    options: unknown;
}

interface FieldMetadata {
    decorators: DecoratorEntry[];
}

type FieldMetadataMap = Record<string, FieldMetadata>;
type Constructor = new (...args: unknown[]) => unknown;

function attachEntityMetadata(ctor: Constructor, tableName: string, fields: FieldMetadataMap): void {
    (ctor as unknown as Record<string, unknown>)[MetadataWriter.ENTITY_METADATA_KEY] = new ClassDecorator('Entity', {
        tableName,
    });
    (ctor as unknown as Record<symbol, unknown>)[Symbol.metadata] = fields;
}

describe('EntityMetadata', () => {
    it('resolves foreign key target table name when target factory returns an entity class', () => {
        class Therapist {}
        (Therapist as unknown as { entityName: string }).entityName = 'therapists';

        class Encounter {}
        attachEntityMetadata(Encounter, 'encounters', {
            therapistId: {
                decorators: [
                    { decoratorName: 'Column', options: { type: 'text' } },
                    { decoratorName: 'ForeignKey', options: { target: () => Therapist } },
                ],
            },
        });

        const metadata = EntityMetadata.for(Encounter as unknown as MetadataConstructor);

        expect(metadata.getForeignKeyTargetTableName('therapistId')).toBe('therapists');
    });

    it('returns null when foreign key target factory returns class without static entityName metadata', () => {
        class PlainTarget {}

        class Encounter {}
        attachEntityMetadata(Encounter, 'encounters', {
            plainTargetId: {
                decorators: [
                    { decoratorName: 'Column', options: { type: 'text' } },
                    { decoratorName: 'ForeignKey', options: { target: () => PlainTarget } },
                ],
            },
        });

        const metadata = EntityMetadata.for(Encounter as unknown as MetadataConstructor);

        expect(metadata.getForeignKeyTargetTableName('plainTargetId')).toBeNull();
    });

    it('returns null when foreign key target factory returns a non-class value', () => {
        class Encounter {}
        attachEntityMetadata(Encounter, 'encounters', {
            invalidTargetId: {
                decorators: [
                    { decoratorName: 'Column', options: { type: 'text' } },
                    {
                        decoratorName: 'ForeignKey',
                        options: {
                            target: () => ({ entityName: 'not-a-class' }),
                        },
                    },
                ],
            },
        });

        const metadata = EntityMetadata.for(Encounter as unknown as MetadataConstructor);

        expect(metadata.getForeignKeyTargetTableName('invalidTargetId')).toBeNull();
    });
});
