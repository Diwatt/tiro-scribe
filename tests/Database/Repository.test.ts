/**
 * Repository tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: Repository (generic CRUD over SQLite).
 * Uses a real in-memory SQLite database via Kysely — no Kysely mocking.
 */

import { vi, describe, beforeAll, beforeEach, it, expect } from 'vitest';
import { Collection } from '@/Database/Collection';
import { Criteria } from '@/Database/Criteria';
import { DatabaseException } from '@/Exception';
import { Repository } from '@/Database/Repository';
import { createMockEncounterConstructor } from '../helpers/mockEntity';
import { ensureTestTable, clearTestTable } from '../../vitest/mocks/kysely';

vi.mock('@/Service/Logger', () => ({
    appLogger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Repository', () => {
    const MockEncounter = createMockEncounterConstructor();
    let repo: Repository;

    beforeAll(() => {
        ensureTestTable('encounters', ['therapist_id']);
    });

    beforeEach(() => {
        clearTestTable('encounters');
        repo = Repository.create(MockEncounter.entityName, MockEncounter as never);
    });

    describe('Z — Zero (empty / no data)', () => {
        it('findAll returns empty array when no data', async () => {
            const result = await repo.findAll();
            expect(result.toArray()).toEqual([]);
        });

        it('exists returns false for unknown key', async () => {
            expect(await repo.exists('unknown')).toBe(false);
        });

        it('find returns null for unknown key', async () => {
            expect(await repo.find('unknown')).toBeNull();
        });

        it('find returns null for non-existent primary key', async () => {
            const result = await repo.find('non-existent');
            expect(result).toBeNull();
        });

        it('findBy with empty criteria returns all entities (same as findAll)', async () => {
            await repo.persist(new MockEncounter({ therapistId: 'a' }));
            const list = await repo.findBy(Criteria.of({}));
            expect(list.length).toBe(1);
        });

        it('findOneBy with empty criteria returns first entity or null', async () => {
            expect(await repo.findOneBy(Criteria.of({}))).toBeNull();
            await repo.persist(new MockEncounter({ therapistId: 'x' }));
            const one = await repo.findOneBy(Criteria.of({}));
            expect(one).toBeInstanceOf(MockEncounter);
        });

        it('search returns empty array when FTS table or matches are absent', async () => {
            const results = await repo.search('anything');
            expect(results.toArray()).toEqual([]);
        });
    });

    describe('O — One (single item happy path)', () => {
        it('persist creates entity and find returns it', async () => {
            const created = await repo.persist(new MockEncounter({ therapistId: 't1' }));
            expect(created).toBeInstanceOf(MockEncounter);
            const primaryKey = created.primaryKey;
            expect(await repo.exists(primaryKey)).toBe(true);
            const found = await repo.find(primaryKey);
            expect(found).toBeInstanceOf(MockEncounter);
            expect(found?.getField('therapistId')).toBe('t1');
        });

        it('findOneBy returns first match or null', async () => {
            await repo.persist(new MockEncounter({ therapistId: 't1' }));
            const one = await repo.findOneBy(Criteria.of({ therapistId: 't1' }));
            expect(one).toBeInstanceOf(MockEncounter);
            expect(await repo.findOneBy(Criteria.of({ therapistId: 'missing' }))).toBeNull();
        });

        it('remove deletes entry', async () => {
            const created = await repo.persist(new MockEncounter({ therapistId: 't1' }));
            const primaryKey = created.primaryKey;
            await repo.remove(created);
            expect(await repo.exists(primaryKey)).toBe(false);
            expect(await repo.find(primaryKey)).toBeNull();
        });

        it('refresh returns entity when it exists', async () => {
            const created = await repo.persist(new MockEncounter({ therapistId: 't1' }));
            const refreshed = await repo.refresh(created);
            expect(refreshed).toBeInstanceOf(MockEncounter);
            expect(refreshed.getField('therapistId')).toBe('t1');
        });
    });

    describe('M — Many (collections)', () => {
        it('findBy returns entities matching criteria', async () => {
            await repo.persist(new MockEncounter({ therapistId: 't1' }));
            await repo.persist(new MockEncounter({ therapistId: 't2' }));
            await repo.persist(new MockEncounter({ therapistId: 't1' }));
            const list = await repo.findBy(Criteria.of({ therapistId: 't1' }));
            expect(list).toHaveLength(2);
        });

        it('findBy accepts orderBy and returns rows', async () => {
            await repo.persist(new MockEncounter({ therapistId: 't1' }));
            await repo.persist(new MockEncounter({ therapistId: 't1' }));
            const list = await repo.findBy(Criteria.of({ therapistId: 't1' }), { orderBy: [{ column: 'uuid', direction: 'asc' }] });
            expect(list).toHaveLength(2);
        });

        it('findOneBy accepts orderBy and returns first row', async () => {
            await repo.persist(new MockEncounter({ therapistId: 't1' }));
            await repo.persist(new MockEncounter({ therapistId: 't1' }));
            const one = await repo.findOneBy(Criteria.of({ therapistId: 't1' }), { orderBy: [{ column: 'uuid', direction: 'desc' }] });
            expect(one).not.toBeNull();
        });

        it('supports pagination via limit and offset', async () => {
            for (let i = 0; i < 5; i++) {
                await repo.persist(new MockEncounter({ therapistId: `p${i}` }));
            }
            const firstTwo = await repo.findAll({ limit: 2, offset: 0 });
            const nextTwo = await repo.findAll({ limit: 2, offset: 2 });
            expect(firstTwo).toHaveLength(2);
            expect(nextTwo).toHaveLength(2);
            const firstPrimaryKeys = firstTwo.map((e) => e.primaryKey).toArray();
            const nextPrimaryKeys = nextTwo.map((e) => e.primaryKey).toArray();
            expect(firstPrimaryKeys.some((primaryKey) => nextPrimaryKeys.includes(primaryKey))).toBe(false);
        });
    });

    describe('B — Boundary', () => {
        it('persist with same primary key updates (upsert)', async () => {
            const one = await repo.persist(new MockEncounter({ therapistId: 't1' }));
            const primaryKey = one.primaryKey;
            await repo.persist(new MockEncounter({ uuid: primaryKey, therapistId: 't2' }));
            const found = await repo.find(primaryKey);
            expect(found?.getField('therapistId')).toBe('t2');
        });

        it('findAll with limit 0 returns empty array', async () => {
            await repo.persist(new MockEncounter({ therapistId: 'x' }));
            const list = await repo.findAll({ limit: 0, offset: 0 });
            expect(list.toArray()).toEqual([]);
        });

        it('findAll with offset beyond size returns empty array', async () => {
            await repo.persist(new MockEncounter({ therapistId: 'x' }));
            const list = await repo.findAll({ limit: 10, offset: 100 });
            expect(list.toArray()).toEqual([]);
        });

        it('orders by primary key when no createdAt index (MockEncounter)', async () => {
            await repo.persist(new MockEncounter({ therapistId: 'o1' }));
            await repo.persist(new MockEncounter({ therapistId: 'o2' }));
            const list = await repo.findAll();
            expect(list.length).toBeGreaterThanOrEqual(2);
            expect(list).toBeInstanceOf(Collection);
        });
    });

    describe('I — Interface (contract)', () => {
        it('findOneBy with where on real columns hydrates correctly', async () => {
            await repo.persist(new MockEncounter({ therapistId: 'r1' }));
            await repo.persist(new MockEncounter({ therapistId: 'r2' }));
            const one = await repo.findOneBy(Criteria.of({ therapistId: 'r2' }));
            expect(one?.getField('therapistId')).toBe('r2');
        });

        it('hydrates foreign key real columns back into entity records when present', async () => {
            const ent = await repo.persist(new MockEncounter({ therapistId: 'fk1' }));
            const found = await repo.find(ent.primaryKey);
            expect(found?.getField('therapistId')).toBe('fk1');
        });

        it('delete then exists returns false', async () => {
            const created = await repo.persist(new MockEncounter({ therapistId: 'x' }));
            const primaryKey = created.primaryKey;
            expect(await repo.exists(primaryKey)).toBe(true);
            await repo.remove(created);
            expect(await repo.exists(primaryKey)).toBe(false);
        });

        it('transaction runs multiple persists in one transaction; all visible after', async () => {
            const primaryKeys = await repo.transaction(async (txRepo) => {
                const a = await txRepo.persist(new MockEncounter({ therapistId: 'tx1' }));
                const b = await txRepo.persist(new MockEncounter({ therapistId: 'tx2' }));
                return [a.primaryKey, b.primaryKey];
            });
            expect(primaryKeys).toHaveLength(2);
            expect(await repo.exists(primaryKeys[0])).toBe(true);
            expect(await repo.exists(primaryKeys[1])).toBe(true);
            expect((await repo.find(primaryKeys[0]))?.getField('therapistId')).toBe('tx1');
            expect((await repo.find(primaryKeys[1]))?.getField('therapistId')).toBe('tx2');
        });
    });

    describe('E — Exceptions', () => {
        it('findBy throws when criterion key is not an entity property name (allowlist)', async () => {
            await expect(repo.findBy(Criteria.of({ 'foo-bar': 'x' }))).rejects.toThrow(DatabaseException);
            await expect(repo.findBy(Criteria.of({ 'foo-bar': 'x' }))).rejects.toThrow(/REPOSITORY_INVALID_CRITERION_KEY|entity property name/);
        });

        it('findBy throws when orderBy column is not an entity property name', async () => {
            await expect(
                repo.findBy(Criteria.of({ therapistId: 't1' }), { orderBy: [{ column: 'invalid-column', direction: 'asc' }] }),
            ).rejects.toThrow(DatabaseException);
            await expect(
                repo.findBy(Criteria.of({ therapistId: 't1' }), { orderBy: [{ column: 'invalid-column', direction: 'asc' }] }),
            ).rejects.toThrow(/REPOSITORY_INVALID_ORDER_BY_COLUMN|entity property name/);
        });

        it('Criteria.of throws when criteria contain nested value (object or array)', () => {
            expect(() => Criteria.of({ therapistId: 'x', payload: { a: 1 } })).toThrow(DatabaseException);
            expect(() => Criteria.of({ therapistId: 'x', payload: { a: 1 } })).toThrow(/REPOSITORY_NESTED_CRITERIA_NOT_SUPPORTED|scalar/);
            expect(() => Criteria.of({ tags: ['a'] })).toThrow(DatabaseException);
        });

        it('persist throws DatabaseException when primary key is empty', async () => {
            await expect(repo.persist(new MockEncounter({ uuid: '' }))).rejects.toThrow(DatabaseException);
            await expect(repo.persist(new MockEncounter({ uuid: '' }))).rejects.toThrow(/empty primary key|primary key/);
        });

        it('persist throws when primary key is whitespace-only', async () => {
            await expect(repo.persist(new MockEncounter({ uuid: '   ' }))).rejects.toThrow();
        });

        it('updates existing entity and returns updated data', async () => {
            const created = await repo.persist(new MockEncounter({ therapistId: 'old' }));
            const primaryKey = created.primaryKey;
            const updated = await repo.persist(new MockEncounter({ uuid: primaryKey, therapistId: 'new' }));
            expect(updated.getField('therapistId')).toBe('new');
            const found = await repo.find(primaryKey);
            expect(found?.getField('therapistId')).toBe('new');
        });

        it('refresh throws when entity not found', async () => {
            const missing = new MockEncounter({ uuid: 'non-existent-uuid' });
            await expect(repo.refresh(missing)).rejects.toThrow(DatabaseException);
            await expect(repo.refresh(missing)).rejects.toThrow(/REPOSITORY_ENTITY_NOT_FOUND|entity with primary key/);
        });
    });

    // add some unit tests for internal helpers and special branches
    describe('U — Utilities & internals', () => {
        it('normalizeForWrite drops keys that are not columns', () => {
            const r: any = repo;
            const result = r.normalizeForWrite({ uuid: 'u', therapistId: 't', extra: 123 });
            expect(result).toEqual({ uuid: 'u', therapistId: 't' });
        });

        it('mergeForPersist merges default, stored and incoming values correctly', () => {
            const r: any = repo;
            const defaults = { a: 1, b: 2 };
            // monkey patch metadata.getColumnDefaults
            r.metadata.getColumnDefaults = () => defaults;
            const merged = r.mergeForPersist({ b: undefined, c: 3 }, { a: 9, b: 8, d: undefined });
            // defaults 1,2 then stored override to 9,8 ; incoming overwrites b with undefined skipped and adds c
            expect(merged).toEqual({ a: 9, b: 8, c: 3 });
        });

        it('toRow stringifies JSON data and includes foreign key columns when configured', () => {
            const r: any = repo;
            // by default MockEncounter has no real foreign-key columns
            let row = r.toRow({ uuid: 'u1', therapistId: 't1', foo: 'bar' });
            expect(row.uuid).toBe('u1');
            expect(typeof row.data).toBe('string');
            // foo is not a column on MockEncounter so it should be removed
            expect(JSON.parse(row.data).foo).toBeUndefined();
            expect(row.therapist_id).toBeUndefined();

            // simulate metadata reporting a foreign key column
            r.realForeignKeyColumns = [{ propertyName: 'therapistId', columnName: 'therapist_id' }];
            row = r.toRow({ uuid: 'u2', therapistId: 't2' });
            expect(row.therapist_id).toBe('t2');
        });

        it('toEntity parses string data and merges foreign key columns', () => {
            const r: any = repo;
            const raw = { uuid: 'u1', data: JSON.stringify({ therapistId: 't1', foo: 'bar' }), therapist_id: 't1' };
            const ent = r.toEntity(raw);
            expect(ent).toBeInstanceOf(MockEncounter);
            expect(ent.getField('foo')).toBe('bar');
            expect(ent.getField('therapistId')).toBe('t1');
        });

        it('transaction returns same repository when db has isTransaction property', async () => {
            const fakeDb: any = { isTransaction: true };
            // pass class as first arg and tableName second
            const inlineRepo = new Repository(MockEncounter as any, MockEncounter.entityName, fakeDb);
            const result = await inlineRepo.transaction(async (r) => {
                expect(r).toBe(inlineRepo);
                return 'done';
            });
            expect(result).toBe('done');
        });

        it('search handles existing WHERE clause via patched queryCompiler', async () => {
            const r: any = repo;
            // patch build to return a where clause with one parameter
            r.queryCompiler = {
                build: () => ({ sql: `SELECT * FROM "${r.tableName}" WHERE foo = ?`, parameters: [42] }),
            };
            // intercept executeQuery
            let called: any;
            r.executeQuery = async (compiled: { sql: string; parameters: unknown[] }) => {
                called = compiled;
                return [];
            };
            await r.search('term');
            expect(called).toBeDefined();
            expect(called.parameters).toEqual(['term', 42]);
            expect(called.sql).toMatch(/WHERE ".+_fts" MATCH \? AND foo = \?/);
        });
    });
});
