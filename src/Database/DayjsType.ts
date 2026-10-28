import type { Platform, TransformContext } from '@mikro-orm/core';
import { Type } from '@mikro-orm/core';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Maps a Dayjs domain value to an UTC ISO string column and back.
 * Signatures mirror the MikroORM `Type` contract exactly (value: JSType -> DBType);
 * runtime tolerates raw strings and nulls coming back from the driver.
 */
export class DayjsType extends Type<Dayjs, string> {
    public convertToDatabaseValue(value: Dayjs, _platform: Platform, _context?: TransformContext): string {
        if (value == null) {
            return null as unknown as string;
        }
        if (typeof value === 'string') {
            return dayjs.utc(value).toISOString();
        }

        return value.toISOString();
    }

    public convertToJSValue(value: string, _platform: Platform, _context?: TransformContext): Dayjs {
        if (value == null) {
            return null as unknown as Dayjs;
        }

        return dayjs.utc(value);
    }

    public getColumnType(_prop?: unknown, _platform?: Platform): string {
        return 'datetime';
    }
}
