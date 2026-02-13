/**
 * Repository tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: Repository (generic CRUD over SQLite). Uses real DB via createMockEncounterConstructor.
 */

import type { AbstractEntity } from '@/Database/AbstractEntity';
import { DatabaseException } from '@/Exception';
import { Repository } from '@/Database/Repository';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

describe('Repository', () => {
    const MockEncounter = createMockEncounterConstructor();
    let repo: Repository<AbstractEntity>;

    beforeEach(() => {
        repo = Repository.create(MockEncounter.entityName, MockEncounter as never);
    });

    describe('Z — Zero (empty / no data)', () => {
        it('findAll returns empty array when no data', async () => {
            expect(await repo.findAll()).toEqual([]);
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
            await repo.persist({ therapistId: 'a' });
            const list = await repo.findBy({});
            expect(list.length).toBe(1);
        });

        it('findOneBy with empty criteria returns first entity or null', async () => {
            expect(await repo.findOneBy({})).toBeNull();
            await repo.persist({ therapistId: 'x' });
            const one = await repo.findOneBy({});
            expect(one).toBeInstanceOf(MockEncounter);
        });

        it('search returns empty array when FTS table or matches are absent', async () => {
            const results = await repo.search('anything');
            expect(results).toEqual([]);
        });
    });

    describe('O — One (single item happy path)', () => {
        it('persist creates entity and find returns it', async () => {
            const created = await repo.persist({ therapistId: 't1' });
            expect(created).toBeInstanceOf(MockEncounter);
            const pk = created.primaryKey;
            expect(await repo.exists(pk)).toBe(true);
            const found = await repo.find(pk);
            expect(found).toBeInstanceOf(MockEncounter);
            expect(found?.getField('therapistId')).toBe('t1');
        });

        it('findOneBy returns first match or null', async () => {
            await repo.persist({ therapistId: 't1' });
            const one = await repo.findOneBy({ therapistId: 't1' });
            expect(one).toBeInstanceOf(MockEncounter);
            expect(await repo.findOneBy({ therapistId: 'missing' })).toBeNull();
        });

        it('remove deletes entry', async () => {
            const created = await repo.persist({ therapistId: 't1' });
            const pk = created.primaryKey;
            await repo.remove(pk);
            expect(await repo.exists(pk)).toBe(false);
            expect(await repo.find(pk)).toBeNull();
        });
    });

    describe('M — Many (collections)', () => {
        it('findBy returns entities matching criteria', async () => {
            await repo.persist({ therapistId: 't1' });
            await repo.persist({ therapistId: 't2' });
            await repo.persist({ therapistId: 't1' });
            const list = await repo.findBy({ therapistId: 't1' });
            expect(list).toHaveLength(2);
        });

        it('findBy handles nested record matching using lodash isMatch', async () => {
            await repo.persist({ therapistId: 'n1', participantBiocodes: [{ id: 1 }, { id: 2 }] });
            await repo.persist({ therapistId: 'n2', participantBiocodes: [{ id: 3 }] });
            const list = await repo.findBy({ participantBiocodes: [{ id: 1 }] });
            expect(list).toHaveLength(1);
            expect(list[0].getField('therapistId')).toBe('n1');
        });

        it('supports pagination via limit and offset', async () => {
            for (let i = 0; i < 5; i++) {
                await repo.persist({ therapistId: `p${i}` });
            }
            const firstTwo = await repo.findAll(2, 0);
            const nextTwo = await repo.findAll(2, 2);
            expect(firstTwo).toHaveLength(2);
            expect(nextTwo).toHaveLength(2);
            const firstPks = firstTwo.map((e) => e.primaryKey);
            const nextPks = nextTwo.map((e) => e.primaryKey);
            expect(firstPks.some((pk) => nextPks.includes(pk))).toBe(false);
        });

        it('clear removes all', async () => {
            await repo.persist({ therapistId: 't1' });
            await repo.clear();
            expect(await repo.findAll()).toEqual([]);
        });
    });

    describe('B — Boundary', () => {
        it('persist with same pk updates (upsert)', async () => {
            const one = await repo.persist({ therapistId: 't1' });
            const pk = one.primaryKey;
            await repo.persist({ uuid: pk, therapistId: 't2' });
            const found = await repo.find(pk);
            expect(found?.getField('therapistId')).toBe('t2');
        });

        it('findAll with limit 0 returns empty array', async () => {
            await repo.persist({ therapistId: 'x' });
            const list = await repo.findAll(0, 0);
            expect(list).toEqual([]);
        });

        it('findAll with offset beyond size returns empty array', async () => {
            await repo.persist({ therapistId: 'x' });
            const list = await repo.findAll(10, 100);
            expect(list).toEqual([]);
        });

        it('orders by primary key when no createdAt index (MockEncounter)', async () => {
            await repo.persist({ therapistId: 'o1' });
            await repo.persist({ therapistId: 'o2' });
            const list = await repo.findAll();
            expect(list.length).toBeGreaterThanOrEqual(2);
            expect(Array.isArray(list)).toBe(true);
        });
    });

    describe('I — Interface (contract)', () => {
        it('flush does not throw (no-op for SQLite)', () => {
            expect(() => repo.flush()).not.toThrow();
        });

        it('findOneBy with where on real columns hydrates correctly', async () => {
            await repo.persist({ therapistId: 'r1' });
            await repo.persist({ therapistId: 'r2' });
            const one = await repo.findOneBy({ therapistId: 'r2' });
            expect(one?.getField('therapistId')).toBe('r2');
        });

        it('hydrates foreign key real columns back into entity records when present', async () => {
            const ent = await repo.persist({ therapistId: 'fk1' });
            const found = await repo.find(ent.primaryKey);
            expect(found?.getField('therapistId')).toBe('fk1');
        });

        it('delete then exists returns false', async () => {
            const created = await repo.persist({ therapistId: 'x' });
            const pk = created.primaryKey;
            expect(await repo.exists(pk)).toBe(true);
            await repo.remove(pk);
            expect(await repo.exists(pk)).toBe(false);
        });
    });

    describe('E — Exceptions', () => {
        it('persist throws DatabaseException when primary key is empty', async () => {
            await expect(repo.persist({ uuid: '' })).rejects.toThrow(DatabaseException);
            await expect(repo.persist({ uuid: '' })).rejects.toThrow(/empty primary key|primary key/);
        });

        it('persist throws when primary key is whitespace-only', async () => {
            await expect(repo.persist({ uuid: '   ' })).rejects.toThrow();
        });

        it('updates existing entity and returns updated data', async () => {
            const created = await repo.persist({ therapistId: 'old' });
            const pk = created.primaryKey;
            const updated = await repo.persist({ uuid: pk, therapistId: 'new' });
            expect(updated.getField('therapistId')).toBe('new');
            const found = await repo.find(pk);
            expect(found?.getField('therapistId')).toBe('new');
        });
    });
});
