/**
 * EntitySerializer: serialize / unserialize entity records for persistence.
 * - serialize: keeps only @Column fields when writing to storage.
 * - unserialize: merges entity defaults with stored record so new columns (migration) get their default.
 */

import mapValues from 'lodash/mapValues';
import pick from 'lodash/pick';
import { MetadataReader } from '../Decorator';
import type { AbstractEntity } from './AbstractEntity';

/** Entity constructor with @Column metadata (AbstractEntity subclasses). */
type EntityConstructor = new (...args: unknown[]) => AbstractEntity;

function buildColumnDefaults(reader: MetadataReader): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const f of reader.getFields()) {
        if (f.getDecoratorName() !== 'Column') {
            continue;
        }
        out[f.getFieldName()] = f.getOption('default');
    }
    return out;
}

export class EntitySerializer {
    private readonly _entityConstructor: EntityConstructor;
    private readonly _columnNames: string[];

    public constructor(entityConstructor: EntityConstructor) {
        this._entityConstructor = entityConstructor;
        this._columnNames = new MetadataReader(entityConstructor)
            .getFields()
            .filter((f) => f.getDecoratorName() === 'Column')
            .map((f) => f.getFieldName());
    }

    /**
     * Serialize: keep only properties that have @Column. Used when writing to storage.
     * Non-column keys in the record are omitted.
     */
    public serialize(record: Record<string, unknown>): Record<string, unknown> {
        return pick(record, this._columnNames) as Record<string, unknown>;
    }

    /**
     * Merge entity defaults with partial data (and optionally stored record for update).
     * Create: mergeWithDefaults(data). Update: mergeWithDefaults(data, storedRecord).
     */
    public mergeWithDefaults(data: Partial<Record<string, unknown>>, storedRecord?: Record<string, unknown>): Record<string, unknown> {
        const defaults = buildColumnDefaults(new MetadataReader(this._entityConstructor));
        return storedRecord != null ? { ...defaults, ...storedRecord, ...data } : { ...defaults, ...data };
    }

    /**
     * Unserialize: merge entity defaults with stored record. Used when reading from storage.
     * New columns (added in a migration) get their default; existing keys keep the stored value.
     */
    public unserialize(storedRecord: Record<string, unknown>): Record<string, unknown> {
        const defaults = buildColumnDefaults(new MetadataReader(this._entityConstructor));
        return { ...defaults, ...storedRecord };
    }

    /**
     * Unserialize every record in a map (e.g. for findAll). Same as unserialize per value.
     */
    public unserializeMap(map: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
        return mapValues(map, (v) => this.unserialize(v) as Record<string, unknown>);
    }
}
