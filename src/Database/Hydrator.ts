/**
 * Hydrator: maps between entity plain record and SQL row, and hydrates rows to entity instances.
 * Record ↔ row (hybrid: uuid, data JSON, real foreign key columns); row → entity.
 */

import type { AbstractEntity, EntityClassStatic } from './AbstractEntity';
import type { EntitySerializer } from './Serializer';

export interface RealForeignKeyColumn {
    propertyName: string;
    columnName: string;
}

export class Hydrator<TEntity extends AbstractEntity> {
    public constructor(
        private readonly entityClass: EntityClassStatic<TEntity>,
        private readonly primaryKeyField: string,
        private readonly primaryKeyColumnName: string,
        private readonly realForeignKeyColumns: RealForeignKeyColumn[],
        private readonly serializer: EntitySerializer,
    ) {}

    /**
     * Maps entity plain record to SQL row: uuid, data (JSON), plus snake_case foreign key columns.
     */
    public mapToSqlColumns(record: Record<string, unknown>): Record<string, unknown> {
        const primaryKeyColumn = this.primaryKeyColumnName;
        const primaryKeyValue = record[this.primaryKeyField];
        const toStore = this.serializer.serialize(record);
        const data = JSON.stringify(toStore);
        const row: Record<string, unknown> = { [primaryKeyColumn]: primaryKeyValue, data };
        for (const { propertyName, columnName } of this.realForeignKeyColumns) {
            row[columnName] = record[propertyName] ?? '';
        }

        return row;
    }

    /**
     * Converts SQL row to plain record (JSON data + real foreign key columns merged, with defaults).
     */
    public rowToPlainRecord(row: Record<string, unknown>): Record<string, unknown> {
        const json = (row.data ?? '{}') as string;
        const parsed = JSON.parse(json) as Record<string, unknown>;
        for (const { propertyName, columnName } of this.realForeignKeyColumns) {
            if (columnName in row && row[columnName] != null) {
                parsed[propertyName] = row[columnName];
            }
        }

        return this.serializer.unserialize(parsed);
    }

    public hydrateFromRow(row: Record<string, unknown>): TEntity {
        const plain = this.rowToPlainRecord(row);
        return new this.entityClass(plain);
    }

    public hydrateRows(rows: Record<string, unknown>[]): TEntity[] {
        return rows.map((r) => this.hydrateFromRow(r));
    }
}
