/**
 * Built-in transformer: value ↔ JSON string.
 * Registered as 'json' in TransformerRegistry.
 * Use for columns that store JSON (e.g. arrays or objects). On parse error, returns [].
 */

import type { FieldTransformer } from './FieldTransformer';

export class JsonTransformer implements FieldTransformer {
    public fromStorage(value: unknown): unknown {
        if (typeof value !== 'string') {
            return value ?? [];
        }
        if (value.trim() === '') {
            return [];
        }
        try {
            const parsed = JSON.parse(value) as unknown;
            return parsed ?? [];
        } catch (_error: unknown) {
            return [];
        }
    }

    public toStorage(value: unknown): unknown {
        if (typeof value === 'string') {
            return value;
        }
        return JSON.stringify(value);
    }
}
