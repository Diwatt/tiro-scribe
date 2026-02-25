// MetadataWriter writes decorator metadata (class and property options)
// to a shared WeakMap. Readers use MetadataReader to access that data.

import { appLogger } from '@/Service/Logger';
import type { MetadataMap } from './Type';

// internal storage for class metadata to avoid mutating constructors
// stored as a public static on the class so callers can access it as
// `MetadataWriter.classMetadataMap` without an extra import.

// No longer importing ClassConstructor; we accept any constructor-like object.

// biome-ignore lint/complexity/noStaticOnlyClass: metadata write API is static
export class MetadataWriter {
    /** WeakMap holding raw options written by registerClass. */
    public static readonly classMetadataMap = new WeakMap<object, Record<string, unknown>>();

    /** Called by class decorators to store their options. */
    public static registerClass(construct: object, options: object): void {
        const logger = appLogger;
        // `name` is often available on constructor functions, but we don't
        // require it in the type so cast to any for the log.
        logger.debug('[MetadataWriter] Registering class', (construct as any).name);

        // store raw options in weak map; reader will wrap when needed
        MetadataWriter.classMetadataMap.set(construct, options as Record<string, unknown>);
    }

    /** Called by property decorators (@Column, @PrimaryKey) to store decorator name and options. */
    public static registerProperty(
        meta: Record<string | symbol, unknown> | undefined | null,
        propertyName: string,
        decoratorName: string,
        options: unknown,
    ): void {
        const logger = appLogger;
        if (meta == null || typeof meta !== 'object') {
            logger.debug('[MetadataWriter] invalid metadata object');
            return;
        }

        const m = meta as MetadataMap;
        if (!m[propertyName]) {
            m[propertyName] = { decorators: [] };
        }

        m[propertyName].decorators?.push({ decoratorName, options });
    }
}
