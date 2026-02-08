/**
 * Built-in transformer: Dayjs ↔ UTC ISO string.
 * Registered as 'date' in TransformerRegistry.
 * Stores UTC in the database (ISO 8601 string); fromStorage returns dayjs in UTC mode.
 */

import dayjs, { type Dayjs } from 'dayjs';
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
