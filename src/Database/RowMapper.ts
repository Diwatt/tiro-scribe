/**
 * RowMapper: maps between entity plain record and SQL row, and rows to entity instances.
 * Record ↔ row (hybrid: primary key column, data JSON, foreign key columns); row → entity.
 * All column and key info is derived from EntityMetadata.
 */

import type { AbstractEntity, EntityClassStatic } from './AbstractEntity';
import type { EntityMetadata } from './Decorator';
import type { RecordNormalizer } from './RecordNormalizer';

export interface RealForeignKeyColumn {
    propertyName: string;
    columnName: string;
}

export class RowMapper<TEntity extends AbstractEntity> {
    public constructor(
        private readonly entityClass: EntityClassStatic<TEntity>,
        private readonly metadata: EntityMetadata,
        private readonly recordNormalizer: RecordNormalizer,
    ) {}

    /**
     * Converts plain record to SQL row: primary key column, data (JSON), plus foreign key columns.
     */
    public toRow(record: Record<string, unknown>): Record<string, unknown> {
        const primaryKeyProperty = this.metadata.getPrimaryKeyField();
        const primaryKeyColumn = this.metadata.getPrimaryKeyColumnName();
        const toStore = this.recordNormalizer.forWrite(record);
        const data = JSON.stringify(toStore);
        const row: Record<string, unknown> = { [primaryKeyColumn]: record[primaryKeyProperty], data };
        for (const { propertyName, columnName } of this.metadata.getForeignKeyColumns()) {
            row[columnName] = record[propertyName] ?? '';
        }

        return row;
    }

    /**
     * Converts SQL row to plain record (JSON data + foreign key columns merged, with defaults).
     */
    private toRecord(row: Record<string, unknown>): Record<string, unknown> {
        const json = (row.data ?? '{}') as string;
        const parsed = JSON.parse(json) as Record<string, unknown>;
        for (const { propertyName, columnName } of this.metadata.getForeignKeyColumns()) {
            if (columnName in row && row[columnName] != null) {
                parsed[propertyName] = row[columnName];
            }
        }

        return this.recordNormalizer.fromStorage(parsed);
    }

    public toEntity(row: Record<string, unknown>): TEntity {
        const plain = this.toRecord(row);

        return new this.entityClass(plain);
    }

    public toEntities(rows: Record<string, unknown>[]): TEntity[] {
        return rows.map((r) => this.toEntity(r));
    }
}
