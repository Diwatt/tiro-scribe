// tests/helpers/kysely.ts
import { Kysely, SqliteDialect, sql } from "kysely";
import Database from "better-sqlite3";

// In-memory test database
let testDb: Database.Database | null = null;

export async function initializeTestDatabase() {
  if (!testDb) {
    testDb = new Database(":memory:");
  }
  return testDb;
}

export async function closeTestDatabase() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

export async function createTestKysely() {
  const db = await initializeTestDatabase();

  const testKysely = new Kysely({
    dialect: new SqliteDialect({
      database: async () => db,
    }),
  });

  return testKysely;
}

export async function ensureTestTable(
  db: Kysely<any>,
  tableName: string,
  schema: Record<string, string>
) {
  const columns = Object.entries(schema)
    .map(([name, type]) => `${name} ${type}`)
    .join(", ");
  
  const ddl = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
  
  await sql.raw(ddl).execute(db);
}

export async function clearTestTable(db: Kysely<any>, tableName: string) {
  await db.deleteFrom(tableName as any).execute();
}

export async function clearAllTestTables(
  db: Kysely<any>,
  tableNames: string[]
) {
  for (const tableName of tableNames) {
    await clearTestTable(db, tableName);
  }
}