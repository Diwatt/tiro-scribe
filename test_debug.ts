import { DefinitionLanguageWriter } from '@/Database/Schema/DefinitionLanguageWriter';
import { TableDefinition } from '@/Database/Schema/TableDefinition';
import { vi } from 'vitest';

const mockTx = {
    execute: vi.fn(() => Promise.resolve({ rows: [] })),
    transaction: async function<T>(fn: (tx: any) => Promise<T>): Promise<T> {
        return fn(mockTx);
    },
};

const definition = new TableDefinition(
    'items',
    'uuid',
    ['uuid VARCHAR(36) PRIMARY KEY', 'data TEXT NOT NULL'],
    [],
    []
);

try {
    const writer = new DefinitionLanguageWriter(mockTx as any);
    console.log('Constructor succeeded');
} catch (error) {
    console.log('Constructor error:', error);
}
