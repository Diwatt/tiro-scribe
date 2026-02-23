import { ClassDecorator } from '@/Decorator/ClassDecorator';

describe('ClassDecorator', () => {
    it('returns decorator name', () => {
        const d = new ClassDecorator('MyDecorator', { foo: 'bar' });
        expect(d.getName()).toBe('MyDecorator');
    });

    it('returns options via getOption', () => {
        const d = new ClassDecorator('D', { alpha: 123 });
        expect(d.getOption('alpha')).toBe(123);
    });

    it('returns full options', () => {
        const opts = { x: true };
        const d = new ClassDecorator('D', opts);
        expect(d.getOptions()).toBe(opts);
        expect(d.getOptions()).toEqual({ x: true });
    });

    it('getOption returns value by name', () => {
        const d = new ClassDecorator('D', { key: 'value' });
        expect(d.getOption('key')).toBe('value');
    });

    it('getOption returns undefined for unknown key', () => {
        const d = new ClassDecorator('D', { key: 'value' });
        expect((d.getOptions() as Record<string, unknown>)['unknown']).toBeUndefined();
    });});
