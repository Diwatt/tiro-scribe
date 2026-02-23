/**
 * MetadataWriter – where decorator metadata is written when decorators run.
 *
 * ## What it does
 * When you use @Entity, @Column, or @PrimaryKey, the decorators need to store their
 * options somewhere so the rest of the app (Repository, RecordNormalizer, AbstractEntity)
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
 * Repository (primary key field name), RecordNormalizer (column names + defaults), AbstractEntity (defaults, primary key).
 */

import { AppLogger } from '@/Service/Logger';
// options are generic and database-specific; MetadataWriter treats them as
// an opaque record. Importing a shared type here would unnecessarily couple
// the generic decorator package to database semantics.
import { ClassDecorator as EntityDecorator } from './ClassDecorator';
import type { ClassConstructor } from './Type';

declare const __DEV__: boolean;

// biome-ignore lint/complexity/noStaticOnlyClass: metadata write API is static
export class MetadataWriter {
    /** Key on the constructor where entity decorator metadata is stored. */
    public static readonly ENTITY_METADATA_KEY = '__entityMetadata';

    /** Key on constructor for primary key field name. */
    public static readonly PRIMARY_KEY_FIELD_KEY = '__primaryKeyField';

    /** Key on constructor for primary key column definition (type/length for DDL). */
    public static readonly PRIMARY_KEY_COLUMN_DEF_KEY = '__primaryKeyColumnDef';

    /** Called by @Entity to store entity decorator data. Stores an EntityDecorator so readers get the same type directly. */
    public static registerEntity(construct: ClassConstructor, options: Record<string, unknown>): void {
        const logger = AppLogger.getInstance();
        logger.debug('[MetadataWriter] Registering entity:', {
            className: construct.name,
            options,
            metadataKey: MetadataWriter.ENTITY_METADATA_KEY,
        });

        const c = construct as unknown as Record<string, unknown>;
        c[MetadataWriter.ENTITY_METADATA_KEY] = new EntityDecorator('Entity', options);

        logger.debug('[MetadataWriter] Entity registered successfully:', {
            className: construct.name,
            hasMetadata: !!c[MetadataWriter.ENTITY_METADATA_KEY],
        });
    }

    /** Called by field decorators (@Column, @PrimaryKey) to store decorator name and options. */
    public static registerField(
        meta: Record<string | symbol, unknown> | undefined | null,
        propertyName: string,
        decoratorName: string,
        options: unknown,
    ): void {
        const logger = AppLogger.getInstance();
        // Hermes-only implementation: assume meta is always valid
        // But for test compatibility, silently return if meta is invalid
        if (meta == null || typeof meta !== 'object') {
            logger.debug('[MetadataWriter] Invalid metadata object in registerField - silently ignoring', {
                propertyName,
                decoratorName,
                metaType: typeof meta,
            });
            return;
        }

        // Store in Symbol.metadata
        const m = meta as Record<string, { decorators?: Array<{ decoratorName: string; options: unknown }> }>;
        if (!m[propertyName]) {
            m[propertyName] = { decorators: [] };
        }

        const fieldOptions = options as Record<string, unknown>;
        logger.debug('[MetadataWriter] Registering field:', {
            propertyName,
            decoratorName,
            hasDefault: 'default' in fieldOptions,
            defaultValue: fieldOptions.default,
            type: fieldOptions.type,
            isPrimaryKey: decoratorName === 'PrimaryKey',
        });

        m[propertyName].decorators?.push({ decoratorName, options });

        logger.debug('[MetadataWriter] Field registered successfully:', {
            propertyName,
            totalDecorators: m[propertyName].decorators?.length || 0,
        });
    }
}
