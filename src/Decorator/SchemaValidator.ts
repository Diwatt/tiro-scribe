/**
 * Validates options objects and decorator metadata. Used by Builder when decorators declare schema/errorCode or unique decorators.
 */

import { DatabaseException, DecoratorException, MULTIPLE_DECORATORS_NOT_SUPPORTED } from '../Exception';
import type { OptionFieldSchema, OptionFieldType, OptionsSchema } from './Type';

export class SchemaValidator {
    /**
     * Throws if any other property already has this decorator name in metadata.
     * Used by Builder when config.unique is true before calling before().
     * Not invoked from validate() because it needs context.metadata and context.name,
     * which are only available when the property decorator runs, not when options are validated.
     */
    public ensurePropertyDecoratorUniqueness(
        meta: Record<string | symbol, unknown> | undefined | null,
        currentPropertyName: string,
        decoratorName: string,
    ): void {
        if (meta == null || typeof meta !== 'object') {
            return;
        }
        const m = meta as Record<string, { decorators?: Array<{ decoratorName: string }> }>;
        for (const [key, fieldMeta] of Object.entries(m)) {
            if (key === currentPropertyName) {
                continue;
            }
            const decorators = fieldMeta?.decorators;
            if (Array.isArray(decorators) && decorators.some((d) => d.decoratorName === decoratorName)) {
                throw new DecoratorException(
                    `Only one property can have @${decoratorName} (already on "${key}", tried to add "${currentPropertyName}")`,
                    MULTIPLE_DECORATORS_NOT_SUPPORTED,
                    undefined,
                    { existingProperty: key, attemptedProperty: currentPropertyName, decoratorName },
                );
            }
        }
    }

    /**
     * Validates options against a declared schema. Throws DatabaseException if invalid.
     */
    public validate(options: object, schema: OptionsSchema, errorCode: string): void {
        const opts = options as Record<string, unknown>;
        for (const [key, field] of Object.entries(schema)) {
            const value = opts[key];
            const isSet = key in opts;
            this.ensureRequired(key, isSet, field, opts, errorCode);
            this.ensureType(key, value, isSet, field, opts, errorCode);
            if (isSet) {
                this.ensureNotBlank(key, value, field, opts, errorCode);
                this.ensureNumberConstraints(key, value, field, opts, errorCode);
            }
        }
    }

    private ensureRequired(key: string, isSet: boolean, field: OptionFieldSchema, options: Record<string, unknown>, errorCode: string): void {
        if (field.required === true && !isSet) {
            throw new DatabaseException(`Option "${key}" is required`, errorCode, undefined, { options });
        }
    }

    private ensureType(key: string, value: unknown, isSet: boolean, field: OptionFieldSchema, options: Record<string, unknown>, errorCode: string): void {
        if (!isSet) {
            return;
        }
        if (field.enum != null) {
            if (typeof value !== 'string' || !field.enum.includes(value)) {
                throw new DatabaseException(`Option "${key}" must be one of [${field.enum.join(', ')}]`, errorCode, undefined, { options, key, value });
            }
            return;
        }
        if (field.type == null) {
            return;
        }
        const allowed = Array.isArray(field.type) ? [...field.type] : [field.type];
        const actual = this.getType(value);
        if (!allowed.includes(actual)) {
            throw new DatabaseException(`Option "${key}" must be of type ${allowed.join(' | ')}`, errorCode, undefined, { options, key, actual });
        }
    }

    private getType(value: unknown): OptionFieldType {
        const t = typeof value;
        if (t === 'string' || t === 'number' || t === 'boolean' || t === 'function') {
            return t;
        }
        return 'object';
    }

    private ensureNotBlank(key: string, value: unknown, field: OptionFieldSchema, options: Record<string, unknown>, errorCode: string): void {
        if (field.notBlank !== true || typeof value !== 'string') {
            return;
        }
        if (value.trim() === '') {
            throw new DatabaseException(`Option "${key}" must not be blank`, errorCode, undefined, { options, key });
        }
    }

    private ensureNumberConstraints(key: string, value: unknown, field: OptionFieldSchema, options: Record<string, unknown>, errorCode: string): void {
        if (typeof value !== 'number') {
            return;
        }
        if (field.integer === true && !Number.isInteger(value)) {
            throw new DatabaseException(`Option "${key}" must be an integer`, errorCode, undefined, { options, key, value });
        }
        if (field.min != null && value < field.min) {
            throw new DatabaseException(`Option "${key}" must be >= ${field.min}`, errorCode, undefined, { options, key, value, min: field.min });
        }
    }
}
