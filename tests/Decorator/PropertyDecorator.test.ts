import { PropertyDecorator } from '@/Decorator/PropertyDecorator';

describe('PropertyDecorator', () => {
    it('returns decorator name, class name, and property name', () => {
        const d = new PropertyDecorator('Column', 'Encounter', 'uuid', { default: 'x' });
        expect(d.getDecoratorName()).toBe('Column');
        expect(d.getClassName()).toBe('Encounter');
        expect(d.getPropertyName()).toBe('uuid');
    });

    it('getOptions returns resolved values (literal as-is)', () => {
        const opts = { default: 'literal', as: 'date' };
        const d = new PropertyDecorator('Column', 'E', 'f', opts);
        expect(d.getOptions()).toEqual({ default: 'literal', as: 'date' });
    });

    it('getOptions resolves factory options (calls functions)', () => {
        const factory = () => 'resolved';
        const d = new PropertyDecorator('Column', 'E', 'f', { default: factory });
        expect(d.getOptions()).toEqual({ default: 'resolved' });    });

    it('getOption returns single option resolved', () => {
        const d = new PropertyDecorator('Column', 'E', 'f', { default: 42 });
        expect(d.getOption('default')).toBe(42);
    });

    it('getOption resolves factory when option is a function', () => {
        const d = new PropertyDecorator('Column', 'E', 'f', { default: () => 99 });
        expect(d.getOption('default')).toBe(99);
    });

    it('getOption returns undefined for unknown key', () => {
        const d = new PropertyDecorator('Column', 'E', 'f', { default: 1 });
        expect(d.getOption('unknown')).toBeUndefined();
    });

    it('getOptions returns empty object when _options is null/undefined', () => {
        const d = new PropertyDecorator('Column', 'E', 'f', undefined);
        expect(d.getOptions()).toEqual({});
    });

    it('getOptions can be called with an explicit generic type', () => {
        const d = new PropertyDecorator('Column', 'E', 'f', { foo: 'bar' });
        const opts = d.getOptions<{ foo: string }>();
        expect(opts.foo).toBe('bar');
    });

    it('does not invoke class constructor values when resolving options', () => {
        class C {}
        const d = new PropertyDecorator('Column', 'E', 'f', { target: C });
        const opts = d.getOptions<{ target: unknown }>();
        expect(opts.target).toBe(C);
    });
});
