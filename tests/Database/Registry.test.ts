import { registry } from '@/Database';
import { DatabaseException } from '@/Exception';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

describe('Registry', () => {
    const MockEncounter = createMockEncounterConstructor();

    describe('Z — Zero (missing entityName)', () => {
        it('getRepository throws DatabaseException with ENTITY_NAME_REQUIRED when entityName is undefined', () => {
            const FakeEntity = { name: 'FakeEntity', entityName: undefined };
            expect(() => registry.getRepository(FakeEntity as never)).toThrow(DatabaseException);
            expect(() => registry.getRepository(FakeEntity as never)).toThrow(/entityName/);
            try {
                registry.getRepository(FakeEntity as never);
            } catch (e) {
                expect((e as DatabaseException).code).toBe('ENTITY_NAME_REQUIRED');
            }
        });

        it('getRepository throws when entityName is empty string', () => {
            const FakeEntity = { name: 'FakeEntity', entityName: '' };
            expect(() => registry.getRepository(FakeEntity as never)).toThrow(DatabaseException);
        });
    });

    describe('O — One (single entity)', () => {
        it('getRepository returns Repository for entity with entityName', () => {
            const repo = registry.getRepository(MockEncounter as never);
            expect(repo).toBeDefined();
            expect(repo.findAll).toBeDefined();
            expect(repo.find).toBeDefined();
            expect(repo.persist).toBeDefined();
        });
    });

    describe('M — Many (caching)', () => {
        it('getRepository returns same instance for same entity (caching)', () => {
            const a = registry.getRepository(MockEncounter as never);
            const b = registry.getRepository(MockEncounter as never);
            expect(a).toBe(b);
        });
    });

    describe('I — Interface (contract)', () => {
        it('returned repository exposes findAll, find, persist, remove', () => {
            const repo = registry.getRepository(MockEncounter as never);
            expect(typeof repo.findAll).toBe('function');
            expect(typeof repo.find).toBe('function');
            expect(typeof repo.persist).toBe('function');
            expect(typeof repo.remove).toBe('function');
        });
    });
});
