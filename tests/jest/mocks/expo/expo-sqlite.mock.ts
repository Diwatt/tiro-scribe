/**
 * expo-sqlite mock factory
 * 
 * This mock provides a minimal in-memory SQLite database interface for testing.
 * It returns mock database objects with the expected API surface.
 * 
 * Use in tests by importing from this file if you need custom behavior per-test.
 * By default, jest.setup.ts applies the global mock.
 */

/**
 * Factory function to create a mock database object
 * Can be parameterized for test-specific behavior
 */
export const createMockDatabase = () => ({
  transaction: jest.fn((fn: any) =>
    Promise.resolve({
      executeSql: jest.fn(async () => ({ 
        rows: { _array: [] }, 
        insertId: 1, 
        rowsAffected: 0 
      })),
    })
  ),
  closeSync: jest.fn(() => {}),
  closeAsync: jest.fn(async () => {}),
  executeSql: jest.fn(async () => ({ 
    rows: { _array: [] }, 
    insertId: 1, 
    rowsAffected: 0 
  })),
  execAsync: jest.fn(async () => {}),
  execSync: jest.fn(() => {}),
  getAllAsync: jest.fn(async () => []),
  getAllSync: jest.fn(() => []),
  getFirstAsync: jest.fn(async () => null),
  getFirstSync: jest.fn(() => null),
  runAsync: jest.fn(async () => ({ insertId: 1, changes: 1 })),
  runSync: jest.fn(() => ({ insertId: 1, changes: 1 })),
  prepareAsync: jest.fn(async () => ({ 
    executeAsync: jest.fn(async () => ({ 
      getAllAsync: jest.fn(async () => []) 
    })) 
  })),
  prepareSync: jest.fn(() => ({ 
    executeSync: jest.fn(() => ({ 
      getAllSync: jest.fn(() => []) 
    })) 
  })),
  eachAsync: jest.fn(async () => {}),
  eachSync: jest.fn(() => {}),
});

/**
 * Default mock for expo-sqlite module
 * Applied globally via jest.setup.ts
 */
export const expoSqliteMock = {
  openDatabaseSync: jest.fn(createMockDatabase),
  openDatabaseAsync: jest.fn(async () => createMockDatabase()),
  deleteDatabaseAsync: jest.fn(async () => {}),
};
