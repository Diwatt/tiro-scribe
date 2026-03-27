/**
 * Registry tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: Registry (getRepository). Repository creation is exercised; DB may be required for full stack.
 */

import { Registry } from '@/Database/Registry';
import { createMockEncounterConstructor } from '../helpers/mockEntity';

jest.mock('@/Core/AppLogger', () => {
    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return {
        AppLogger: {
            getInstance: jest.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

import { Container } from '@/Core/Container';
import { AppConfig } from '@/Core/AppConfig';

Container.register(AppConfig, () => ({ databaseName: 'test_db' } as any));

describe('Registry', () => {
    const MockEncounter = createMockEncounterConstructor();
    let registry: Registry;

    beforeEach(() => {
        registry = new Registry();
    });

    describe('Z — Zero (missing entityName)', () => {
        it('getRepository rejects with DatabaseException with ENTITY_NAME_REQUIRED when entityName is undefined', async () => {
            const FakeEntity = { name: 'FakeEntity', entityName: undefined };
            expect(() => registry.getRepository(FakeEntity as never)).toThrow(/entityName/);
            try {
                registry.getRepository(FakeEntity as never);
            } catch (e) {
                expect((e as any).name).toBe('DatabaseException');
                expect((e as any).code).toBe('ENTITY_NAME_REQUIRED');
            }
        });

        it('getRepository rejects when entityName is empty string', async () => {
            const FakeEntity = { name: 'FakeEntity', entityName: '' };
            expect(() => registry.getRepository(FakeEntity as never)).toThrow(/entityName/);
        });
    });

    describe('O — One (single entity)', () => {
        it('getRepository returns Repository for entity with entityName', async () => {
            const repo = registry.getRepository(MockEncounter as never);
            expect(repo).toBeDefined();
            expect(repo.findAll).toBeDefined();
            expect(repo.find).toBeDefined();
            expect(repo.persist).toBeDefined();
        });
    });

    describe('M — Many (caching)', () => {
        it('getRepository returns same instance for same entity (caching)', async () => {
            const a = registry.getRepository(MockEncounter as never);
            const b = registry.getRepository(MockEncounter as never);
            expect(a).toBe(b);
        });
    });

    describe('I — Interface (contract)', () => {
        it('returned repository exposes findAll, find, persist, remove', async () => {
            const repo = registry.getRepository(MockEncounter as never);
            expect(typeof repo.findAll).toBe('function');
            expect(typeof repo.find).toBe('function');
            expect(typeof repo.persist).toBe('function');
            expect(typeof repo.remove).toBe('function');
        });
    });

    describe('E — Exceptions', () => {
        it('getRepository rejects with DatabaseException with code ENTITY_NAME_REQUIRED when entityName is missing', async () => {
            const FakeEntity = { name: 'FakeEntity', entityName: undefined };
            try {
                registry.getRepository(FakeEntity as never);
                expect.fail('should have thrown');
            } catch (e) {
                expect((e as any).name).toBe('DatabaseException');
                expect((e as any).code).toBe('ENTITY_NAME_REQUIRED');
            }
        });

        it('getRepository rejects when entityName is empty string', async () => {
            const FakeEntity = { name: 'FakeEntity', entityName: '' };
            expect(() => registry.getRepository(FakeEntity as never)).toThrow(/entityName/);
        });
    });
});
