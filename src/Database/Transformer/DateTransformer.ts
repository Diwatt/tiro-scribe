/**
 * Built-in transformer: Date ↔ timestamp (number).
 * Registered as 'date' in TransformerRegistry.
 */

import type { FieldTransformer } from './FieldTransformer';

export class DateTransformer implements FieldTransformer {
    public toStorage(value: unknown): unknown {
        return value instanceof Date ? value.getTime() : value;
    }

    public fromStorage(value: unknown): unknown {
        return value != null ? new Date(value as number) : value;
    }
}
