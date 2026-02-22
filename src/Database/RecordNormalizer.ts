/**
 * RecordNormalizer - Normalizes records between application format and database storage.
 * Uses EntityMetadata to determine which fields are columns and their defaults.
 */

import type { EntityMetadata } from './Decorator';

export class RecordNormalizer {
    private readonly metadata: EntityMetadata;

    public constructor(metadata: EntityMetadata) {
        this.metadata = metadata;
    }

    /**
     * Normalizes a record for writing to the database.
     * Only includes fields that are database columns.
     */
    public forWrite(record: Record<string, unknown>): Record<string, unknown> {
        const columnNames = this.metadata.getColumnNames();
        const result: Record<string, unknown> = {};

        for (const fieldName of columnNames) {
            if (Object.hasOwn(record, fieldName)) {
                result[fieldName] = record[fieldName];
            }
        }

        return result;
    }

    /**
     * Normalizes a record read from database storage.
     * Applies defaults for missing columns.
     */
    public fromStorage(stored: Record<string, unknown>): Record<string, unknown> {
        const columnNames = this.metadata.getColumnNames();
        const columnDefaults = this.metadata.getColumnDefaults();
        const result: Record<string, unknown> = {};

        for (const fieldName of columnNames) {
            if (Object.hasOwn(stored, fieldName)) {
                result[fieldName] = stored[fieldName];
            } else if (Object.hasOwn(columnDefaults, fieldName)) {
                result[fieldName] = columnDefaults[fieldName];
            }
        }

        return result;
    }

    /**
     * Normalizes a map of stored records keyed by primary key.
     */
    public fromStorageMap(storedMap: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
        const result: Record<string, Record<string, unknown>> = {};

        for (const [key, stored] of Object.entries(storedMap)) {
            result[key] = this.fromStorage(stored);
        }

        return result;
    }
}
