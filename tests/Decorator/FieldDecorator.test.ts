import { FieldDecorator } from '@/Decorator/FieldDecorator';

describe('FieldDecorator', () => {
    it('returns decorator name, entity name, and field name', () => {
        const d = new FieldDecorator('Column', 'Encounter', 'uuid', { default: 'x' });
        expect(d.getDecoratorName()).toBe('Column');
        expect(d.getEntityName()).toBe('Encounter');
        expect(d.getFieldName()).toBe('uuid');
    });

    it('getOptions returns resolved values (literal as-is)', () => {
        const opts = { default: 'literal', as: 'date' };
        const d = new FieldDecorator('Column', 'E', 'f', opts);
        expect(d.getOptions()).toEqual({ default: 'literal', as: 'date' });
    });

    it('getOptions resolves factory options (calls functions)', () => {
        const factory = () => 'resolved';
        const d = new FieldDecorator('Column', 'E', 'f', { default: factory });
        expect(d.getOptions()).toEqual({ default: 'resolved' });
    });

    it('getOption returns single option resolved', () => {
        const d = new FieldDecorator('Column', 'E', 'f', { default: 42 });
        expect(d.getOption('default')).toBe(42);
    });

    it('getOption resolves factory when option is a function', () => {
        const d = new FieldDecorator('Column', 'E', 'f', { default: () => 99 });
        expect(d.getOption('default')).toBe(99);
    });

    it('getOption returns undefined for unknown key', () => {
        const d = new FieldDecorator('Column', 'E', 'f', { default: 1 });
        expect(d.getOption('unknown')).toBeUndefined();
    });

    it('getOptions returns empty object when _options is null/undefined', () => {
        const d = new FieldDecorator('Column', 'E', 'f', undefined);
        expect(d.getOptions()).toEqual({});
    });
});
