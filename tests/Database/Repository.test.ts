import type { AbstractEntity } from '@/Database/AbstractEntity';
import { Repository } from '@/Database/Repository';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

describe('Repository', () => {
    const MockEncounter = createMockEncounterConstructor();
    let repo: Repository<AbstractEntity>;

    beforeEach(() => {
        repo = Repository.create(MockEncounter.entityName, MockEncounter as any);
    });

    it('findAll returns empty array when no data', () => {
        expect(repo.findAll()).toEqual([]);
    });

    it('exists returns false for unknown key', () => {
        expect(repo.exists('unknown')).toBe(false);
    });

    it('find returns null for unknown key', () => {
        expect(repo.find('unknown')).toBeNull();
    });

    it('persist creates entity and find returns it', () => {
        const created = repo.persist({ therapistId: 't1' });
        expect(created).toBeInstanceOf(MockEncounter);
        const pk = created.primaryKey;
        expect(repo.exists(pk)).toBe(true);
        const found = repo.find(pk);
        expect(found).toBeInstanceOf(MockEncounter);
        expect(found!.getField('therapistId')).toBe('t1');
    });

    it('persist with same pk updates', () => {
        const one = repo.persist({ therapistId: 't1' });
        const pk = one.primaryKey;
        repo.persist({ uuid: pk, therapistId: 't2' });
        const found = repo.find(pk);
        expect(found!.getField('therapistId')).toBe('t2');
    });

    it('findBy returns entities matching criteria', () => {
        repo.persist({ therapistId: 't1' });
        repo.persist({ therapistId: 't2' });
        repo.persist({ therapistId: 't1' });
        const list = repo.findBy({ therapistId: 't1' });
        expect(list).toHaveLength(2);
    });

    it('findOneBy returns first match or null', () => {
        repo.persist({ therapistId: 't1' });
        const one = repo.findOneBy({ therapistId: 't1' });
        expect(one).toBeInstanceOf(MockEncounter);
        expect(repo.findOneBy({ therapistId: 'missing' })).toBeNull();
    });

    it('remove deletes entry', () => {
        const created = repo.persist({ therapistId: 't1' });
        const pk = created.primaryKey;
        repo.remove(pk);
        expect(repo.exists(pk)).toBe(false);
        expect(repo.find(pk)).toBeNull();
    });

    it('clear removes all', () => {
        repo.persist({ therapistId: 't1' });
        repo.clear();
        expect(repo.findAll()).toEqual([]);
    });

    it('flush does not throw', () => {
        expect(() => repo.flush()).not.toThrow();
    });
});
