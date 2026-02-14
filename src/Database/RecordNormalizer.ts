/**
 * RecordNormalizer: normalizes plain records for persistence (column subset + defaults).
 * Used when writing (forWrite), when reading (fromStorage). No SQL or row layout — only record shape.
 */

import type { EntityMetadata } from './Decorator';

export class RecordNormalizer {
    public constructor(private readonly metadata: EntityMetadata) {}

    /**
     * Keeps only @Column properties. Used when writing to storage (e.g. before JSON in row).
     */
    public forWrite(record: Record<string, unknown>): Record<string, unknown> {
        const keys = this.metadata.getColumnNames();

        return Object.fromEntries(
            keys.filter((key) => key in record).map((key) => [key, record[key]]),
        ) as Record<string, unknown>;
    }

    /**
     * Merges entity defaults with stored record. Used when reading from storage (e.g. after JSON parse).
     * New columns (migration) get their default.
     */
    public fromStorage(storedRecord: Record<string, unknown>): Record<string, unknown> {
        const defaults = this.metadata.getColumnDefaults();

        return { ...defaults, ...storedRecord };
    }

    /**
     * Applies fromStorage to each value in the map.
     */
    public fromStorageMap(map: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
        return Object.fromEntries(
            Object.entries(map).map(([k, v]) => [k, this.fromStorage(v) as Record<string, unknown>]),
        );
    }
}
