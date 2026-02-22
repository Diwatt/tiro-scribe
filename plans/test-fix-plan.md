# Test Fix Plan

## Summary
The test suite has 30 failing tests across four test files due to structural issues with mocks and test pollution. The root causes have been identified and a plan to fix them is outlined below.

## Failing Test Files
1. `tests/Database/Schema/DefinitionBuilder.test.ts` (10 failures)
2. `tests/Database/QueryCompiler.test.ts` (5 failures)
3. `tests/Database/Repository.test.ts` (15 failures)
4. `tests/Service/InferenceModel/InferenceModelDownloader.test.ts` (0 tests due to import error)

## Root Causes

### 1. Kysely Mock Insufficient
- **Missing `compile` method** on `CreateIndexBuilder` chain used by `DefinitionBuilder`.
- **Missing `clearDataStore`** attached to mock instance causing test pollution.
- **`compile` method of `SelectQueryBuilder`** returns static SQL without WHERE, LIMIT, OFFSET, ORDER BY clauses.
- **`where` condition handling** only supports simple string patterns, not `sql` template literals.
- **`orderBy` not implemented** in mock.

### 2. Test Pollution
Data persists across tests because `clearDataStore` is not attached to the mock instance, and the `beforeEach` hook cannot clear the data store.

### 3. Expo/Fetch Import Error
The mock for `expo/fetch` is not being resolved correctly, causing a module resolution error.

## Plan of Action

### Phase 1: Fix Kysely Mock (`vitest/mocks/kysely.ts`)
1. **Attach `clearDataStore` to mock instance**
   - Add `clearDataStore: clearDataStore` property to the returned mockInstance.
2. **Enhance `createIndex` builder**
   - Add a `compile` method to the builder returned by `ifNotExists()` (and optionally `execute`).
   - `compile()` should return `{ sql: string }` with a plausible CREATE INDEX SQL statement.
3. **Enhance `selectFrom` builder's `compile` method**
   - Incorporate stored WHERE conditions, LIMIT, OFFSET, ORDER BY into generated SQL.
   - Store WHERE conditions as an array of `{ sql: string, parameters: unknown[] }` from `sql` template literals.
   - Implement `where` to accept `sql` objects, call their `compile()` and store the result.
   - Implement `orderBy` to store column and direction.
   - Generate SQL string that includes clauses (e.g., `SELECT * FROM table WHERE ... LIMIT ...`).
4. **Update `sql` mock (`mockSql`)**
   - Ensure `sql` template literals produce objects with `compile` method that returns `{ sql: string, parameters: unknown[] }`.
   - Already present; verify it works.

### Phase 2: Fix Expo/Fetch Resolution
1. **Verify alias** in `vitest.config.ts` points to `./vitest/mocks/expo-fetch.ts`.
2. **Ensure mock file exports** `fetch` as a named export (currently correct).
3. **Check if `vi.mock` for `expo/fetch` is active** (it is, in `vitest/setup.ts` line 27‑38).
4. **If error persists**, consider adding a default export or adjusting the alias to use `.js` extension.

### Phase 3: Validate Test Pollution Fix
1. After attaching `clearDataStore`, verify that `beforeEach` in `Repository.test.ts` can clear data.
2. Run the Repository tests to ensure they pass.

### Phase 4: Run All Tests
1. Execute `pnpm test` after each phase to verify fixes.
2. Iterate if any failures remain.

## Implementation Notes
- **Keep mock simplicity** where possible; avoid over‑engineering.
- **Use existing patterns** in the mock (e.g., `vi.fn` chains) to maintain consistency.
- **Test the mocks** by running the failing test suites after each change.

## Expected Outcome
After implementing the above changes, all 30 failing tests should pass, and the `InferenceModelDownloader` test suite should run (though it may have its own failures).

## Next Steps
1. **Approve this plan** – let me know if you want any adjustments.
2. **Switch to Code mode** – I’ll implement the changes step‑by‑step.
3. **Run tests** after each significant change to ensure progress.

Let me know if you’re ready to proceed.