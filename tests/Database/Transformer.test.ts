import { DateTransformer, TransformerRegistry } from '@/Database/Transformer';
import type { FieldTransformer } from '@/Database/Transformer';
import dayjs from 'dayjs';

const CUSTOM_TEST_KEY = 'custom_test';

describe('DateTransformer', () => {
    const transformer = new DateTransformer();

    it('toStorage converts Date to UTC ISO string', () => {
        const d = new Date(1234567890000);
        expect(transformer.toStorage(d)).toBe('2009-02-13T23:31:30.000Z');
    });

    it('toStorage returns value as-is for non-date types (string)', () => {
        expect(transformer.toStorage('x')).toBe('x');
    });

    it('toStorage converts number (timestamp) to ISO string', () => {
        expect(transformer.toStorage(0)).toBe('1970-01-01T00:00:00.000Z');
    });

    it('fromStorage converts timestamp to Dayjs in UTC', () => {
        const out = transformer.fromStorage(1234567890000);
        expect(dayjs.isDayjs(out)).toBe(true);
        expect(out.valueOf()).toBe(1234567890000);
    });

    it('fromStorage converts ISO string to Dayjs', () => {
        const out = transformer.fromStorage('2009-02-13T23:31:30.000Z');
        expect(dayjs.isDayjs(out)).toBe(true);
        expect(out.valueOf()).toBe(1234567890000);
    });

    it('fromStorage returns default Dayjs when null/undefined', () => {
        const outNull = transformer.fromStorage(null);
        const outUndef = transformer.fromStorage(undefined);
        expect(dayjs.isDayjs(outNull)).toBe(true);
        expect(dayjs.isDayjs(outUndef)).toBe(true);
    });
});

describe('TransformerRegistry', () => {
    it('get returns undefined for unregistered name', () => {
        expect(TransformerRegistry.get('nonexistent')).toBeUndefined();
    });

    it('get returns date transformer for "date"', () => {
        const t = TransformerRegistry.get('date');
        expect(t).toBeDefined();
        expect(t?.toStorage(new Date(0))).toBe('1970-01-01T00:00:00.000Z');
    });

    it('register and get custom transformer', () => {
        const custom: FieldTransformer = {
            toStorage: (v) => String(v),
            fromStorage: (v) => v,
        };
        TransformerRegistry.register(CUSTOM_TEST_KEY, custom);
        expect(TransformerRegistry.get(CUSTOM_TEST_KEY)).toBe(custom);
    });

    afterEach(() => {
        TransformerRegistry.unregister(CUSTOM_TEST_KEY);
    });
});
