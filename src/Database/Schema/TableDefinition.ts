/**
 * DTO for one table’s schema: name, primary key column, column DDL lines, index DDL lines, FTS field names.
 *
 * **Why it exists:** It is the contract between “read entity metadata” and “run schema SQL” so both steps
 * stay decoupled and testable. No raw entity classes or DB connections are passed between them.
 *
 * **Produced by:** new DefinitionBuilder(reader).build() — reader supplies @Entity / @Column / @PrimaryKey metadata.
 * **Consumed by:** new DefinitionLanguageWriter(tx).write(definition) — runs CREATE TABLE, CREATE INDEX, full-text search table + triggers.
 * **Orchestration:** Database.initialize(entityClasses) creates a Database instance and runs its openAndSync(), which builds one definition per entity and passes each to the writer inside a transaction.
 */

/** Full-text search field: property name and optional JSON path to index (e.g. '$.text' for array of objects). */
export interface FullTextSearchFieldSpec {
    readonly name: string;
    /** When set, full-text search indexes text extracted from each array element at this path; otherwise raw value. */
    readonly jsonPath?: string;
}

export class TableDefinition {
    public constructor(
        public readonly tableName: string,
        public readonly primaryKeyColumnName: string,
        public readonly columns: readonly string[],
        public readonly indexes: readonly string[],
        public readonly fullTextSearchFields: readonly FullTextSearchFieldSpec[],
    ) {}
}
