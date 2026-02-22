/**
 * EntityGateway - Simple gateway for executing SQL statements against a database table.
 * Used as an abstraction layer between Repository and database connection.
 */

export interface CompiledStatement {
    sql: string;
    parameters: unknown[];
}

export interface Connection {
    execute(sql: string, parameters: unknown[]): Promise<{ rows?: unknown[] } | undefined>;
}

export interface ForeignKeyMapping {
    propertyName: string;
    columnName: string;
}

export class EntityGateway {
    private readonly connection: Connection;
    private readonly tableName: string;
    private readonly primaryKeyColumn: string;

    public constructor(connection: Connection, tableName: string, primaryKeyColumn: string, foreignKeys: ForeignKeyMapping[]) {
        this.connection = connection;
        this.tableName = tableName;
        this.primaryKeyColumn = primaryKeyColumn;
        this.foreignKeys = foreignKeys;
    }

    public getConnection(): Connection {
        return this.connection;
    }

    public async executeQuery(stmt: CompiledStatement): Promise<unknown[]> {
        const result = await this.connection.execute(stmt.sql, stmt.parameters);
        return result?.rows ?? [];
    }

    public async executeUpdate(stmt: CompiledStatement): Promise<void> {
        await this.connection.execute(stmt.sql, stmt.parameters);
    }

    public async persist(data: Record<string, unknown>): Promise<void> {
        // Simple implementation for test compatibility
        // In a real implementation, this would generate INSERT/UPDATE SQL
        const sql = `INSERT OR REPLACE INTO ${this.tableName} (${this.primaryKeyColumn}, data) VALUES (?, ?)`;
        const parameters = [data[this.primaryKeyColumn], JSON.stringify(data)];
        await this.executeUpdate({ sql, parameters });
    }

    public async remove(primaryKeyValue: string): Promise<void> {
        const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKeyColumn} = ?`;
        await this.executeUpdate({ sql, parameters: [primaryKeyValue] });
    }
}
