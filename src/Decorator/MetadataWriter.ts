/**
 * MetadataWriter – where decorator metadata is written when decorators run.
 *
 * ## What it does
 * When you use @Entity, @Column, or @PrimaryKey, the decorators need to store their
 * options somewhere so the rest of the app (Repository, Serializer, AbstractEntity)
 * can read them later. MetadataWriter is that “write” API: it’s the single place
 * that knows how and where to attach metadata to the class constructor.
 *
 * ## Where it writes
 * - **Entity**: On the **class constructor** under a well-known key. We store an
 *   EntityDecorator instance so MetadataReader.getEntity() can return it directly.
 *
 * - **Fields (Column, PrimaryKey)**: On the **Stage 3 decorator metadata** object.
 *   We store the raw shape { decorators: [...] } because entityName is not available
 *   at field-decorator execution time; MetadataReader builds FieldDecorator on read using construct.name.
 *
 * ## Who calls it
 * - **@Entity** (Database/Entity.ts): in its `decorate`, calls `MetadataWriter.registerEntity(target, options)`.
 * - **@Column** (Database/Column.ts): in its `before`, calls `MetadataWriter.registerField(meta, context.name, 'Column', options)`.
 * - **@PrimaryKey** (Database/PrimaryKey.ts): in its `before`, calls `MetadataWriter.registerField(meta, context.name, 'PrimaryKey', {})`.
 *
 * ## Who reads what was written
 * **MetadataReader** reads the same keys/structure (entity key + Symbol.metadata). Used by
 * Repository (primary key field name), Serializer (column names + defaults), AbstractEntity (defaults, primary key).
 */

import { EntityDecorator } from './EntityDecorator';
import type { ClassConstructor } from './Type';

// biome-ignore lint/complexity/noStaticOnlyClass: metadata write API is static
export class MetadataWriter {
    /** Key on the constructor where entity decorator metadata is stored. */
    public static readonly ENTITY_METADATA_KEY = '__entityMetadata';

    /** Key on constructor for primary key field name (Hermes fallback when Symbol.metadata unreadable). */
    public static readonly PRIMARY_KEY_FIELD_KEY = '__primaryKeyField';

    /** Called by @Entity to store entity decorator data. Stores an EntityDecorator so readers get the same type directly. */
    public static registerEntity(construct: ClassConstructor, options: { tableName: string }): void {
        const c = construct as unknown as Record<string, unknown>;
        c[MetadataWriter.ENTITY_METADATA_KEY] = new EntityDecorator('Entity', options);
    }

    /** Called by field decorators (@Column, @PrimaryKey) to store decorator name and options. */
    public static registerField(meta: Record<string | symbol, unknown> | undefined, propertyName: string, decoratorName: string, options: unknown): void {
        if (meta == null || typeof meta !== 'object') {
            return;
        }
        const m = meta as Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }>;
        if (!m[propertyName]) {
            m[propertyName] = { decorators: [] };
        }
        m[propertyName].decorators?.push({ decoratorName, options });
    }
}
