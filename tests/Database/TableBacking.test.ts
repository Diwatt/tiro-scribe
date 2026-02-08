import { TableBacking } from '@/Database/TableBacking';

describe('TableBacking', () => {
    let backing: TableBacking;

    beforeEach(() => {
        backing = new TableBacking('test_table');
    });

    it('get returns empty object initially', () => {
        expect(backing.get()).toEqual({});
    });

    it('has returns false for missing key', () => {
        expect(backing.has('x')).toBe(false);
    });

    it('setEntry and getEntry round-trip', () => {
        backing.setEntry('pk1', { uuid: 'pk1', name: 'a' });
        expect(backing.has('pk1')).toBe(true);
        expect(backing.getEntry('pk1')).toEqual({ uuid: 'pk1', name: 'a' });
    });

    it('set replaces full map', () => {
        backing.setEntry('a', { x: 1 });
        backing.set({ b: { y: 2 } });
        expect(backing.get()).toEqual({ b: { y: 2 } });
        expect(backing.has('a')).toBe(false);
    });

    it('deleteEntry removes key', () => {
        backing.setEntry('pk1', {});
        backing.deleteEntry('pk1');
        expect(backing.has('pk1')).toBe(false);
        expect(backing.getEntry('pk1')).toBeUndefined();
    });

    it('deleteEntry is no-op when key missing', () => {
        expect(() => backing.deleteEntry('missing')).not.toThrow();
    });

    it('keys returns all primary keys', () => {
        backing.setEntry('a', {});
        backing.setEntry('b', {});
        expect(backing.keys()).toEqual(expect.arrayContaining(['a', 'b']));
        expect(backing.keys()).toHaveLength(2);
    });

    it('keysWhere filters by criteria', () => {
        backing.setEntry('1', { status: 'pending', x: 1 });
        backing.setEntry('2', { status: 'DONE', x: 1 });
        backing.setEntry('3', { status: 'pending', x: 2 });
        expect(backing.keysWhere({ status: 'pending' })).toEqual(expect.arrayContaining(['1', '3']));
        expect(backing.keysWhere({ status: 'pending', x: 1 })).toEqual(['1']);
    });

    it('findOneKeyBy returns first matching key or null', () => {
        backing.setEntry('1', { status: 'pending' });
        backing.setEntry('2', { status: 'pending' });
        const pk = backing.findOneKeyBy({ status: 'pending' });
        expect(['1', '2']).toContain(pk);
        expect(backing.findOneKeyBy({ status: 'MISSING' })).toBeNull();
    });

    it('clear removes all entries', () => {
        backing.setEntry('a', {});
        backing.clear();
        expect(backing.get()).toEqual({});
        expect(backing.keys()).toHaveLength(0);
    });

    it('flush does not throw', () => {
        backing.setEntry('a', {});
        expect(() => backing.flush()).not.toThrow();
    });
});
