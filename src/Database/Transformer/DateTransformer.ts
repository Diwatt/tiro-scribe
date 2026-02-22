/**
 * Built-in transformer: Dayjs ↔ UTC ISO 8601 string.
 * Single datetime convention: wall-clock = UTC ISO string in DB and DTOs (see Entity/Type.ts).
 * Registered as 'date' in TransformerRegistry.
 */

import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { FieldTransformer } from './FieldTransformer';

dayjs.extend(utc);

export type { Dayjs };

export class DateTransformer implements FieldTransformer {
    public toStorage(value: unknown): unknown {
        if (value == null) {
            return value;
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value !== 'number' && !(value instanceof Date) && !dayjs.isDayjs(value)) {
            return value;
        }
        const d = dayjs(value as string | number | Date | Dayjs);
        return d.isValid() ? dayjs.utc(d).toISOString() : value;
    }

    public fromStorage(value: unknown): Dayjs {
        if (value == null || value === '') {
            return dayjs.utc();
        }
        if (typeof value === 'number') {
            return dayjs.utc(value);
        }
        if (typeof value === 'string') {
            const d = dayjs.utc(value);
            return d.isValid() ? d : dayjs.utc();
        }
        return dayjs.utc();
    }
}
