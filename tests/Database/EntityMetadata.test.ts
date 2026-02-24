import { EntityMetadata } from '@/Database/Decorator';
import { ClassDecorator } from '@/Decorator/ClassDecorator';
import { MetadataWriter } from '@/Decorator/MetadataWriter';
import type { MetadataConstructor, MetadataMap, DecoratorMetadata } from '@/Decorator/Type';
import { AbstractEntity } from '@/Database/AbstractEntity';
import { DatabaseException } from '@/Exception';

// legacy local types replaced by shared definitions
// note: MetadataMap already encapsulates field metadata
type Constructor = new (...args: unknown[]) => unknown;

function attachEntityMetadata(ctor: Constructor, tableName: string, fields: MetadataMap): void {
    // use writer to store options in weak map directly
    MetadataWriter.classMetadataMap.set(ctor, { tableName });
    (ctor as unknown as Record<symbol, unknown>)[Symbol.metadata] = fields;
}

describe('EntityMetadata', () => {
    it('resolves foreign key target table name when target factory returns an entity class', () => {
        // Use a real subclass of AbstractEntity; EntityMetadata only accepts those.
        class Therapist extends AbstractEntity {}
        // set the static name just like decorator would
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

    it('also works when the decorator target is the class directly (not a factory)', () => {
        class Therapist extends AbstractEntity {}
        (Therapist as any).entityName = 'therapists';

        class Encounter {}
        attachEntityMetadata(Encounter, 'encounters', {
            therapistId2: {
                decorators: [
                    { decoratorName: 'Column', options: { type: 'text' } },
                    { decoratorName: 'ForeignKey', options: { target: Therapist } },
                ],
            },
        });

        const metadata = EntityMetadata.for(Encounter as unknown as MetadataConstructor);
        expect(metadata.getForeignKeyTargetTableName('therapistId2')).toBe('therapists');
    });

    describe('column helpers', () => {
        it('getColumnField returns the decorator when present', () => {
            class Sample {}
            attachEntityMetadata(Sample, 'sample', {
                foo: { decorators: [{ decoratorName: 'Column', options: { type: 'text' } }] },
            });

            const metadata = EntityMetadata.for(Sample as unknown as MetadataConstructor);
            const field = metadata.getColumnField('foo');
            expect(field).toBeDefined();
            expect(field?.getPropertyName()).toBe('foo');

            const missing = metadata.getColumnField('bar');
            expect(missing).toBeUndefined();
        });

        it('getOrderByColumnName uses created_at when createdAt has index', () => {
            class Sample2 {}
            attachEntityMetadata(Sample2, 'sample2', {
                id: { decorators: [{ decoratorName: 'PrimaryKey', options: {} }, { decoratorName: 'Column', options: { type: 'integer' } }] },
                createdAt: { decorators: [{ decoratorName: 'Column', options: { type: 'integer', index: true } }] },
            });

            const metadata = EntityMetadata.for(Sample2 as unknown as MetadataConstructor);
            expect(metadata.getOrderByColumnName()).toBe('created_at');
        });

        it('getOrderByColumnName falls back to primary key when createdAt not indexed', () => {
            class Sample3 {}
            attachEntityMetadata(Sample3, 'sample3', {
                id: { decorators: [{ decoratorName: 'PrimaryKey', options: {} }, { decoratorName: 'Column', options: { type: 'integer' } }] },
                createdAt: { decorators: [{ decoratorName: 'Column', options: { type: 'integer', index: false } }] },
            });

            const metadata = EntityMetadata.for(Sample3 as unknown as MetadataConstructor);
            expect(metadata.getOrderByColumnName()).toBe('id');
        });
    });

    describe('additional metadata helpers', () => {
        it('getColumnDefaults returns evaluated default values', () => {
            class F {}
            attachEntityMetadata(F, 'f', {
                a: { decorators: [{ decoratorName: 'Column', options: { default: () => 'x' } }] },
                b: { decorators: [{ decoratorName: 'Column', options: { default: 2 } }] },
            });
            const metadata = EntityMetadata.for(F as unknown as MetadataConstructor);
            expect(metadata.getColumnDefaults()).toEqual({ a: 'x', b: 2 });
        });

        it('getColumnNames returns all column property names', () => {
            class G {}
            attachEntityMetadata(G, 'g', {
                id: { decorators: [{ decoratorName: 'PrimaryKey', options: {} }, { decoratorName: 'Column', options: {} }] },
                one: { decorators: [{ decoratorName: 'Column', options: {} }] },
            });
            const metadata = EntityMetadata.for(G as unknown as MetadataConstructor);
            expect(metadata.getColumnNames().sort()).toEqual(['id', 'one']);
        });

        it('getForeignKeyColumns includes snake_cased columnName', () => {
            class H {}
            attachEntityMetadata(H, 'h', {
                fkField: { decorators: [{ decoratorName: 'Column', options: {} }, { decoratorName: 'ForeignKey', options: { target: () => H } }] },
            });
            const metadata = EntityMetadata.for(H as unknown as MetadataConstructor);
            const fks = metadata.getForeignKeyColumns();
            expect(fks).toHaveLength(1);
            expect(fks[0]).toEqual({ propertyName: 'fkField', columnName: 'fk_field' });
        });

        it('getForeignKeyOptions returns options or undefined', () => {
            class I {}
            attachEntityMetadata(I, 'i', {
                fk: { decorators: [{ decoratorName: 'Column', options: {} }, { decoratorName: 'ForeignKey', options: { target: () => I, column: 'id' } }] },
                plain: { decorators: [{ decoratorName: 'Column', options: {} }] },
            });
            const metadata = EntityMetadata.for(I as unknown as MetadataConstructor);
            expect(metadata.getForeignKeyOptions('fk')).toEqual({ target: expect.any(Function), column: 'id' });
            expect(metadata.getForeignKeyOptions('plain')).toBeUndefined();
        });

        it('getPrimaryKeyColumnField returns undefined when no Column decorator on pk', () => {
            class J {}
            attachEntityMetadata(J, 'j', {
                id: { decorators: [{ decoratorName: 'PrimaryKey', options: {} }] },
            });
            const metadata = EntityMetadata.for(J as unknown as MetadataConstructor);
            expect(metadata.getPrimaryKeyColumnField()).toBeUndefined();
        });

        it('getPrimaryKeyField throws when no primary key metadata', () => {
            class K {}
            attachEntityMetadata(K, 'k', {});
            const metadata = EntityMetadata.for(K as unknown as MetadataConstructor);
            expect(() => metadata.getPrimaryKeyField()).toThrow(DatabaseException);
        });

        it('getColumnExpression returns correct expression for pk, fk, and normal fields', () => {
            class L {}
            attachEntityMetadata(L, 'l', {
                uuid: { decorators: [{ decoratorName: 'PrimaryKey', options: {} }, { decoratorName: 'Column', options: {} }] },
                fk: { decorators: [{ decoratorName: 'Column', options: {} }, { decoratorName: 'ForeignKey', options: { target: () => L } }] },
                other: { decorators: [{ decoratorName: 'Column', options: {} }] },
            });
            const metadata = EntityMetadata.for(L as unknown as MetadataConstructor);
            expect(metadata.getColumnExpression('uuid')).toBe('uuid');
            expect(metadata.getColumnExpression('fk')).toBe('fk');
            expect(metadata.getColumnExpression('other')).toBe("json_extract(data, '$.other')");
        });

        it('getRepositoryClassName returns undefined when not set and value when provided', () => {
            class M {}
            attachEntityMetadata(M, 'm', {});
            const meta1 = EntityMetadata.for(M as unknown as MetadataConstructor);
            expect(meta1.getRepositoryClassName()).toBeUndefined();

            class N {}
            attachEntityMetadata(N, 'n', {});
            // manually add repositoryClass option via writer
            MetadataWriter.classMetadataMap.set(N as unknown as object, { tableName: 'n', repositoryClass: 'MyRepo' } as any);
            const meta2 = EntityMetadata.for(N as unknown as MetadataConstructor);
            expect(meta2.getRepositoryClassName()).toBe('MyRepo');
        });

        it('getTableName returns the table name provided', () => {
            class O {}
            attachEntityMetadata(O, 'o_table', {});
            const meta = EntityMetadata.for(O as unknown as MetadataConstructor);
            expect(meta.getTableName()).toBe('o_table');
        });

        it('getColumnNames result is cached (same object returned)', () => {
            class P {}
            attachEntityMetadata(P, 'p', {
                a: { decorators: [{ decoratorName: 'Column', options: {} }] },
            });
            const metadata = EntityMetadata.for(P as unknown as MetadataConstructor);
            const first = metadata.getColumnNames();
            const second = metadata.getColumnNames();
            expect(first).toBe(second);
        });
    });
});
