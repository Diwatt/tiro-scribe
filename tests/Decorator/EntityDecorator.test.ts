import { EntityDecorator } from '@/Decorator/EntityDecorator';

describe('EntityDecorator', () => {
    it('returns decorator name "Entity"', () => {
        const d = new EntityDecorator('Entity', { table_name: 'users' });
        expect(d.getDecoratorName()).toBe('Entity');
    });

    it('returns entity/table name from options', () => {
        const d = new EntityDecorator('Entity', { table_name: 'encounters' });
        expect(d.getEntityName()).toBe('encounters');
    });

    it('returns full options', () => {
        const opts = { table_name: 'therapists' };
        const d = new EntityDecorator('Entity', opts);
        expect(d.getOptions()).toBe(opts);
        expect(d.getOptions()).toEqual({ table_name: 'therapists' });
    });

    it('getOption returns value by name', () => {
        const d = new EntityDecorator('Entity', { table_name: 'queue_items' });
        expect(d.getOption('table_name')).toBe('queue_items');
    });

    it('getOption returns undefined for unknown key', () => {
        const d = new EntityDecorator('Entity', { table_name: 'foo' });
        expect(d.getOption('unknown')).toBeUndefined();
    });
});
