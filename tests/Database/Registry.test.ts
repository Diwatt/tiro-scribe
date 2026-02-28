/**
 * Registry tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: Registry (getRepository). Repository creation is exercised; DB may be required for full stack.
 */

import { registry } from '@/Database';
import { DatabaseException } from '@/Exception';
import { createMockEncounterConstructor } from '../helpers/mockEntity';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/Service/Logger', () => ({
    appLogger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Registry', () => {
    const MockEncounter = createMockEncounterConstructor();

    describe('Z — Zero (missing entityName)', () => {
        it('getRepository rejects with DatabaseException with ENTITY_NAME_REQUIRED when entityName is undefined', async () => {
            const FakeEntity = { name: 'FakeEntity', entityName: undefined };
            await expect(registry.getRepository(FakeEntity as never)).rejects.toThrow(DatabaseException);
            await expect(registry.getRepository(FakeEntity as never)).rejects.toThrow(/entityName/);
            try {
                await registry.getRepository(FakeEntity as never);
            } catch (e) {
                expect((e as DatabaseException).code).toBe('ENTITY_NAME_REQUIRED');
            }
        });

        it('getRepository rejects when entityName is empty string', async () => {
            const FakeEntity = { name: 'FakeEntity', entityName: '' };
            await expect(registry.getRepository(FakeEntity as never)).rejects.toThrow(DatabaseException);
        });
    });

    describe('O — One (single entity)', () => {
        it('getRepository returns Repository for entity with entityName', async () => {
            const repo = await registry.getRepository(MockEncounter as never);
            expect(repo).toBeDefined();
            expect(repo.findAll).toBeDefined();
            expect(repo.find).toBeDefined();
            expect(repo.persist).toBeDefined();
        });
    });

    describe('M — Many (caching)', () => {
        it('getRepository returns same instance for same entity (caching)', async () => {
            const a = await registry.getRepository(MockEncounter as never);
            const b = await registry.getRepository(MockEncounter as never);
            expect(a).toBe(b);
        });
    });

    describe('I — Interface (contract)', () => {
        it('returned repository exposes findAll, find, persist, remove', async () => {
            const repo = await registry.getRepository(MockEncounter as never);
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
                await registry.getRepository(FakeEntity as never);
                expect.fail('should have thrown');
            } catch (e) {
                expect(e).toBeInstanceOf(DatabaseException);
                expect((e as DatabaseException).code).toBe('ENTITY_NAME_REQUIRED');
            }
        });

        it('getRepository rejects when entityName is empty string', async () => {
            const FakeEntity = { name: 'FakeEntity', entityName: '' };
            await expect(registry.getRepository(FakeEntity as never)).rejects.toThrow(DatabaseException);
        });
    });
});
