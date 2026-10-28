import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DayjsType } from '@/Database/DayjsType';

dayjs.extend(utc);

/** Loose runtime view used by the unit tests (the ORM contract types are stricter). */
interface RuntimeTypeContract {
    convertToDatabaseValue(value: unknown): string | null;
    convertToJSValue(value: unknown): Dayjs | null;
    getColumnType(): string;
}

describe('DayjsType', () => {
    const type = new DayjsType() as unknown as RuntimeTypeContract;

    it('converts Dayjs to UTC ISO string', () => {
        const result = type.convertToDatabaseValue(dayjs('2026-10-27T10:00:00Z'));
        expect(result).toBe('2026-10-27T10:00:00.000Z');
    });

    it('accepts an ISO string as database value (no-op normalization)', () => {
        const result = type.convertToDatabaseValue('2026-10-27T10:00:00.000Z');
        expect(result).toBe('2026-10-27T10:00:00.000Z');
    });

    it('converts null and undefined to null', () => {
        expect(type.convertToDatabaseValue(null)).toBeNull();
        expect(type.convertToDatabaseValue(undefined)).toBeNull();
    });

    it('converts ISO string to Dayjs in UTC mode', () => {
        const result = type.convertToJSValue('2026-10-27T10:00:00.000Z');
        expect(dayjs.isDayjs(result)).toBe(true);
        expect(result?.isUTC()).toBe(true);
        expect(result?.toISOString()).toBe('2026-10-27T10:00:00.000Z');
    });

    it('converts null database value to null', () => {
        expect(type.convertToJSValue(null)).toBeNull();
    });

    it('declares datetime column type', () => {
        expect(type.getColumnType()).toBe('datetime');
    });
});
