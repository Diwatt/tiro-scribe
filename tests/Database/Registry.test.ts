import { registry } from '@/Database';
import { TiroScribeException } from '@/Exception';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

describe('Registry', () => {
    const MockEncounter = createMockEncounterConstructor();

    it('getRepository returns Repository for entity with entityName', () => {
        const repo = registry.getRepository(MockEncounter as any);
        expect(repo).toBeDefined();
        expect(repo.findAll).toBeDefined();
        expect(repo.find).toBeDefined();
        expect(repo.persist).toBeDefined();
    });

    it('getRepository returns same instance for same entity (caching)', () => {
        const a = registry.getRepository(MockEncounter as any);
        const b = registry.getRepository(MockEncounter as any);
        expect(a).toBe(b);
    });

    it('getRepository throws when entity has no entityName', () => {
        const FakeEntity = { name: 'FakeEntity', entityName: undefined };
        expect(() => registry.getRepository(FakeEntity as any)).toThrow(TiroScribeException);
        expect(() => registry.getRepository(FakeEntity as any)).toThrow(/entityName/);
    });
});
