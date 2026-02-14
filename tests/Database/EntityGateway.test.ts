/**
 * EntityGateway tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: EntityGateway. Connection mocked; no real I/O.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityGateway } from '@/Database/EntityGateway';
import type { CompiledStatement } from '@/Database/EntityGateway';

describe('EntityGateway', () => {
    const mockExecute = vi.fn();
    const TABLE = 'test_table';
    const PRIMARY_KEY_COLUMN = 'uuid';
    const NO_FK: { propertyName: string; columnName: string }[] = [];
    let gateway: EntityGateway;

    beforeEach(() => {
        vi.mocked(mockExecute).mockReset();
        gateway = new EntityGateway(
            { execute: mockExecute } as never,
            TABLE,
            PRIMARY_KEY_COLUMN,
            NO_FK,
        );
    });

    describe('Z — Zero', () => {
        it('executeQuery returns empty array when connection returns no rows', async () => {
            mockExecute.mockResolvedValue({ rows: [] });
            const result = await gateway.executeQuery({ sql: 'SELECT 1', parameters: [] });
            expect(result).toEqual([]);
        });

        it('executeQuery returns empty array when connection returns undefined rows', async () => {
            mockExecute.mockResolvedValue({});
            const result = await gateway.executeQuery({ sql: 'SELECT 1', parameters: [] });
            expect(result).toEqual([]);
        });
    });

    describe('O — One', () => {
        it('executeQuery calls connection.execute with sql and parameters', async () => {
            mockExecute.mockResolvedValue({ rows: [{ id: 1 }] });
            await gateway.executeQuery({ sql: 'SELECT * FROM t', parameters: [1] });
            expect(mockExecute).toHaveBeenCalledTimes(1);
            expect(mockExecute).toHaveBeenCalledWith('SELECT * FROM t', [1]);
        });

        it('executeQuery returns normalized row array', async () => {
            mockExecute.mockResolvedValue({ rows: [{ uuid: 'a', data: '{}' }] });
            const result = await gateway.executeQuery({ sql: 'SELECT 1', parameters: [] });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ uuid: 'a', data: '{}' });
        });

        it('executeUpdate calls connection.execute and returns void', async () => {
            mockExecute.mockResolvedValue(undefined);
            await gateway.executeUpdate({ sql: 'INSERT INTO t VALUES (?)', parameters: ['x'] });
            expect(mockExecute).toHaveBeenCalledWith('INSERT INTO t VALUES (?)', ['x']);
        });

        it('getConnection returns injected connection', () => {
            const conn = { execute: mockExecute };
            const g = new EntityGateway(conn as never, TABLE, PRIMARY_KEY_COLUMN, NO_FK);
            expect(g.getConnection()).toBe(conn);
        });
    });

    describe('M — Many', () => {
        it('executeQuery returns all rows from connection', async () => {
            const rows = [
                { uuid: '1', data: '{}' },
                { uuid: '2', data: '{}' },
            ];
            mockExecute.mockResolvedValue({ rows });
            const result = await gateway.executeQuery({ sql: 'SELECT * FROM t', parameters: [] });
            expect(result).toHaveLength(2);
            expect(result).toEqual(rows);
        });
    });

    describe('I — Interface', () => {
        it('executeQuery passes CompiledStatement sql and parameters to connection', async () => {
            mockExecute.mockResolvedValue({ rows: [] });
            const stmt: CompiledStatement = { sql: 'SELECT ?', parameters: ['a', 2, null] };
            await gateway.executeQuery(stmt);
            expect(mockExecute).toHaveBeenCalledWith('SELECT ?', ['a', 2, null]);
        });

        it('executeUpdate passes CompiledStatement to connection', async () => {
            mockExecute.mockResolvedValue(undefined);
            const stmt: CompiledStatement = { sql: 'UPDATE t SET x = ?', parameters: [1] };
            await gateway.executeUpdate(stmt);
            expect(mockExecute).toHaveBeenCalledWith(stmt.sql, stmt.parameters);
        });

        it('persist calls executeUpdate with insert/upsert SQL', async () => {
            mockExecute.mockResolvedValue(undefined);
            await gateway.persist({ uuid: 'pk-1', data: '{}' });
            expect(mockExecute).toHaveBeenCalledTimes(1);
            expect(mockExecute.mock.calls[0][0].toLowerCase()).toContain('insert');
        });

        it('remove calls executeUpdate with delete SQL', async () => {
            mockExecute.mockResolvedValue(undefined);
            await gateway.remove('pk-1');
            expect(mockExecute).toHaveBeenCalledTimes(1);
            expect(mockExecute.mock.calls[0][0].toLowerCase()).toContain('delete');
        });

    });

    describe('E — Exceptions', () => {
        it('executeQuery propagates connection execute rejection', async () => {
            mockExecute.mockRejectedValue(new Error('DB error'));
            await expect(gateway.executeQuery({ sql: 'SELECT 1', parameters: [] })).rejects.toThrow('DB error');
        });

        it('executeUpdate propagates connection execute rejection', async () => {
            mockExecute.mockRejectedValue(new Error('DB error'));
            await expect(gateway.executeUpdate({ sql: 'INSERT 1', parameters: [] })).rejects.toThrow('DB error');
        });
    });
});
