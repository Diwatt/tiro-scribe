/**
 * Transformer tests — ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions.
 * SUT: DateTransformer, JsonTransformer (via TransformerRegistry), TransformerRegistry.
 */

import dayjs from 'dayjs';
import type { FieldTransformer } from '@/Database/Transformer';
import { DateTransformer, JsonTransformer, TransformerRegistry } from '@/Database/Transformer';

const CUSTOM_TEST_KEY = 'custom_test';

describe('DateTransformer', () => {
    const transformer = new DateTransformer();

    describe('Z — Zero (null / undefined)', () => {
        it('toStorage returns value as-is for null/undefined', () => {
            expect(transformer.toStorage(null)).toBeNull();
            expect(transformer.toStorage(undefined)).toBeUndefined();
        });

        it('fromStorage returns default Dayjs when null/undefined', () => {
            const outNull = transformer.fromStorage(null);
            const outUndef = transformer.fromStorage(undefined);
            expect(dayjs.isDayjs(outNull)).toBe(true);
            expect(dayjs.isDayjs(outUndef)).toBe(true);
        });

        it('fromStorage returns default Dayjs when empty string', () => {
            const out = transformer.fromStorage('');
            expect(dayjs.isDayjs(out)).toBe(true);
        });
    });

    describe('O — One (single value)', () => {
        it('toStorage converts Date to UTC ISO string', () => {
            const d = new Date(1234567890000);
            expect(transformer.toStorage(d)).toBe('2009-02-13T23:31:30.000Z');
        });

        it('toStorage returns value as-is for non-date types (string)', () => {
            expect(transformer.toStorage('x')).toBe('x');
        });

        it('fromStorage converts ISO string to Dayjs', () => {
            const out = transformer.fromStorage('2009-02-13T23:31:30.000Z');
            expect(dayjs.isDayjs(out)).toBe(true);
            expect(out.valueOf()).toBe(1234567890000);
        });
    });

    describe('B — Boundary', () => {
        it('toStorage converts number (timestamp) to ISO string', () => {
            expect(transformer.toStorage(0)).toBe('1970-01-01T00:00:00.000Z');
        });

        it('fromStorage converts timestamp to Dayjs in UTC', () => {
            const out = transformer.fromStorage(1234567890000);
            expect(dayjs.isDayjs(out)).toBe(true);
            expect(out.valueOf()).toBe(1234567890000);
        });
    });

    describe('I — Interface (toStorage/fromStorage round-trip)', () => {
        it('fromStorage(toStorage(Date)) preserves instant', () => {
            const d = new Date(1234567890000);
            const stored = transformer.toStorage(d);
            const back = transformer.fromStorage(stored);
            expect(dayjs.isDayjs(back)).toBe(true);
            expect(back.valueOf()).toBe(1234567890000);
        });
    });
});

describe('JsonTransformer', () => {
    const transformer = new JsonTransformer();

    describe('Z — Zero', () => {
        it('fromStorage returns [] for empty string', () => {
            expect(transformer.fromStorage('')).toEqual([]);
        });

        it('fromStorage returns [] for null/undefined', () => {
            expect(transformer.fromStorage(null)).toEqual([]);
            expect(transformer.fromStorage(undefined)).toEqual([]);
        });
    });

    describe('O — One', () => {
        it('toStorage stringifies object', () => {
            expect(transformer.toStorage({ a: 1 })).toBe('{"a":1}');
        });

        it('toStorage returns string as-is', () => {
            expect(transformer.toStorage('already')).toBe('already');
        });

        it('fromStorage parses valid JSON string', () => {
            expect(transformer.fromStorage('{"x":1}')).toEqual({ x: 1 });
        });
    });

    describe('E — Exceptions (resilience)', () => {
        it('fromStorage returns [] on parse error', () => {
            expect(transformer.fromStorage('not json')).toEqual([]);
        });
    });
});

describe('TransformerRegistry', () => {
    describe('Z — Zero', () => {
        it('get returns undefined for unregistered name', () => {
            expect(TransformerRegistry.get('nonexistent')).toBeUndefined();
        });
    });

    describe('O — One', () => {
        it('get returns date transformer for "date"', () => {
            const t = TransformerRegistry.get('date');
            expect(t).toBeDefined();
            expect(t?.toStorage(new Date(0))).toBe('1970-01-01T00:00:00.000Z');
        });
    });

    describe('I — Interface (register / get / unregister)', () => {
        it('register and get custom transformer', () => {
            const custom: FieldTransformer = {
                toStorage: (v) => String(v),
                fromStorage: (v) => v,
            };
            TransformerRegistry.register(CUSTOM_TEST_KEY, custom);
            expect(TransformerRegistry.get(CUSTOM_TEST_KEY)).toBe(custom);
        });

        it('unregister removes transformer', () => {
            const custom: FieldTransformer = { toStorage: (v) => v, fromStorage: (v) => v };
            TransformerRegistry.register(CUSTOM_TEST_KEY, custom);
            TransformerRegistry.unregister(CUSTOM_TEST_KEY);
            expect(TransformerRegistry.get(CUSTOM_TEST_KEY)).toBeUndefined();
        });
    });

    afterEach(() => {
        TransformerRegistry.unregister(CUSTOM_TEST_KEY);
    });
});
