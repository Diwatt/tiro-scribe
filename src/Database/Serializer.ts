/**
 * EntitySerializer: serialize / unserialize entity records for persistence.
 * - serialize: keeps only @Column fields when writing to storage.
 * - unserialize: merges entity defaults with stored record so new columns (migration) get their default.
 */

import mapValues from 'lodash/mapValues';
import pick from 'lodash/pick';
import { MetadataReader } from '../Decorator';
import type { MetadataConstructor } from '../Decorator/Type';
import type { AbstractEntity } from './AbstractEntity';

/** Entity constructor with @Column metadata (AbstractEntity subclasses). */
type EntityConstructor = new (...args: unknown[]) => AbstractEntity;

export class EntitySerializer {
    private readonly entityConstructor: EntityConstructor;
    private readonly columnNames: string[];

    public constructor(entityConstructor: EntityConstructor) {
        this.entityConstructor = entityConstructor;
        this.columnNames = new MetadataReader(entityConstructor as MetadataConstructor)
            .getFields()
            .filter((f) => f.getDecoratorName() === 'Column')
            .map((f) => f.getFieldName());
    }

    /**
     * Serialize: keep only properties that have @Column. Used when writing to storage.
     * Non-column keys in the record are omitted.
     */
    public serialize(record: Record<string, unknown>): Record<string, unknown> {
        return pick(record, this.columnNames) as Record<string, unknown>;
    }

    /**
     * Merge entity defaults with partial data (and optionally stored record for update).
     * Create: mergeWithDefaults(data). Update: mergeWithDefaults(data, storedRecord).
     */
    public mergeWithDefaults(data: Partial<Record<string, unknown>>, storedRecord?: Record<string, unknown>): Record<string, unknown> {
        const defaults = this.buildColumnDefaults();
        return storedRecord != null ? { ...defaults, ...storedRecord, ...data } : { ...defaults, ...data };
    }

    /**
     * Unserialize: merge entity defaults with stored record. Used when reading from storage.
     * New columns (added in a migration) get their default; existing keys keep the stored value.
     */
    public unserialize(storedRecord: Record<string, unknown>): Record<string, unknown> {
        const defaults = this.buildColumnDefaults();
        return { ...defaults, ...storedRecord };
    }

    private buildColumnDefaults(): Record<string, unknown> {
        const reader = new MetadataReader(this.entityConstructor as MetadataConstructor);
        const out: Record<string, unknown> = {};
        for (const f of reader.getFields()) {
            if (f.getDecoratorName() !== 'Column') {
                continue;
            }
            out[f.getFieldName()] = f.getOption('default');
        }

        return out;
    }

    /**
     * Unserialize every record in a map (e.g. for findAll). Same as unserialize per value.
     */
    public unserializeMap(map: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
        return mapValues(map, (v) => this.unserialize(v) as Record<string, unknown>);
    }
}
