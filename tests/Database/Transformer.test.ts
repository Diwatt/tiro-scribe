import { DateTransformer, TransformerRegistry } from '@/Database/Transformer';
import type { FieldTransformer } from '@/Database/Transformer';

describe('DateTransformer', () => {
    const transformer = new DateTransformer();

    it('toStorage converts Date to timestamp', () => {
        const d = new Date(1234567890000);
        expect(transformer.toStorage(d)).toBe(1234567890000);
    });

    it('toStorage returns value as-is when not Date', () => {
        expect(transformer.toStorage(42)).toBe(42);
        expect(transformer.toStorage('x')).toBe('x');
    });

    it('fromStorage converts timestamp to Date', () => {
        const out = transformer.fromStorage(1234567890000);
        expect(out).toBeInstanceOf(Date);
        expect((out as Date).getTime()).toBe(1234567890000);
    });

    it('fromStorage returns value as-is when null/undefined', () => {
        expect(transformer.fromStorage(null)).toBe(null);
        expect(transformer.fromStorage(undefined)).toBe(undefined);
    });
});

describe('TransformerRegistry', () => {
    it('get returns undefined for unregistered name', () => {
        expect(TransformerRegistry.get('nonexistent')).toBeUndefined();
    });

    it('get returns date transformer for "date"', () => {
        const t = TransformerRegistry.get('date');
        expect(t).toBeDefined();
        expect(t?.toStorage(new Date(0))).toBe(0);
    });

    it('register and get custom transformer', () => {
        const custom: FieldTransformer = {
            toStorage: (v) => String(v),
            fromStorage: (v) => v,
        };
        TransformerRegistry.register('custom_test', custom);
        expect(TransformerRegistry.get('custom_test')).toBe(custom);
    });
});
