import trim from 'lodash/trim';
import { Entity } from '@/Database/Decorator/Entity';
import { PrimaryKey } from '@/Database/Decorator/PrimaryKey';
import { Column } from '@/Database/Decorator/Column';
import { AbstractEntity } from '@/Database/AbstractEntity';
import { EntityMetadata } from '@/Database/Decorator';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/App/Logger', () => {
    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
    return {
        AppLogger: {
            getInstance: vi.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

describe('Entity decorator normalization', () => {
    it('trims tableName and repositoryClass before assignment', () => {
        // add the minimal required decorators so the class passes validation
        // (EntityDecorator enforces a primary key with @Column)
        @Entity({ tableName: '  my_table  ', repositoryClass: '  FooRepo  ' })
        class Sample extends AbstractEntity {
            @PrimaryKey()
            @Column({ type: 'integer', default: 0 })
            id!: number;
        }

        // decorator should have removed the whitespace
        expect(Sample.entityName).toBe('my_table');

        // metadata should also reflect the trimmed value
        const metadata = EntityMetadata.for(Sample as unknown as any);
        expect(metadata.getTableName()).toBe('my_table');

        // repositoryClass is stored in metadata as well
        expect(metadata.getRepositoryClassName()).toBe('FooRepo');
    });

    it('still rejects entirely blank names via schema validator', () => {
        // the builder will throw on invalid options; we just assert that the
        // exception message mentions "must not be blank" so the validation
        // path is exercised.
        expect(() => {
            @Entity({ tableName: '   ' })
            class Bad extends AbstractEntity {}
        }).toThrow(/must not be blank/);
    });
});
