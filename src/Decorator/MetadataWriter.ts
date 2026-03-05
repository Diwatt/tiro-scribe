// MetadataWriter writes decorator metadata (class and property options)
// to a shared WeakMap. Readers use MetadataReader to access that data.

import type { MetadataMap } from './Type';

// internal storage for class metadata to avoid mutating constructors
// stored as a public static on the class so callers can access it as
// `MetadataWriter.classMetadataMap` without an extra import.

// No longer importing ClassConstructor; we accept any constructor-like object.

export class MetadataWriter {
    /** WeakMap holding raw options written by registerClass. */
    public static readonly classMetadataMap = new WeakMap<object, Record<string, unknown>>();

    /** Called by class decorators to store their options. */
    public static registerClass(construct: object, options: object): void {
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
        if (meta == null || typeof meta !== 'object') {
            return;
        }
        const m = meta as MetadataMap;
        if (!m[propertyName]) {
            m[propertyName] = { decorators: [] };
        }

        m[propertyName].decorators?.push({ decoratorName, options });
    }
}
