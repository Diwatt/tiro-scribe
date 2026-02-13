import { EntityDecorator } from '@/Decorator/EntityDecorator';

describe('EntityDecorator', () => {
    it('returns decorator name "Entity"', () => {
        const d = new EntityDecorator('Entity', { tableName: 'users' });
        expect(d.getDecoratorName()).toBe('Entity');
    });

    it('returns entity/table name from options', () => {
        const d = new EntityDecorator('Entity', { tableName: 'encounters' });
        expect(d.getEntityName()).toBe('encounters');
    });

    it('returns full options', () => {
        const opts = { tableName: 'therapists' };
        const d = new EntityDecorator('Entity', opts);
        expect(d.getOptions()).toBe(opts);
        expect(d.getOptions()).toEqual({ tableName: 'therapists' });
    });

    it('getOption returns value by name', () => {
        const d = new EntityDecorator('Entity', { tableName: 'queue_items' });
        expect(d.getOption('tableName')).toBe('queue_items');
    });

    it('getOption returns undefined for unknown key', () => {
        const d = new EntityDecorator('Entity', { tableName: 'foo' });
        expect((d.getOptions() as Record<string, unknown>)['unknown']).toBeUndefined();
    });
});
