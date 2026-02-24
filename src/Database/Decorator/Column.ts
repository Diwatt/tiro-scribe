/**
 * Column decorator: use on a property declaration. Registers default in metadata and wires the property
 * to the entity state (get/set delegate to getField/setField). With as: 'date' uses Date API.
 *
 * For each @Column() field "foo" you get: this.foo / this.foo = x (value access through fieldValues).
 *
 * @example
 * @Column({ default: () => crypto.randomUUID(), type: 'text' })
 * public uuid!: string;
 */

import { Builder, type OptionsFromSchema, type OptionsSchema, type PropertyDecoratorConfig } from '../../Decorator/Builder';
import { MetadataWriter } from '../../Decorator/MetadataWriter';
import { DatabaseException } from '../../Exception';
import type { AbstractEntity } from '../AbstractEntity';
import { TransformerRegistry } from '../Transformer';

/**
 * SQLite type affinity for virtual columns and schema. Single source of truth.
 * @see https://www.sqlite.org/datatype3.html
 */
const SQLITE_TYPE_VALUES = [
    'text',
    'integer',
    'int',
    'real',
    'blob',
    'numeric',
    'boolean',
    'date',
    'datetime',
    'varchar',
    'char',
    'character',
    'decimal',
    'float',
    'double',
    'clob',
] as const;

export type SqliteType = (typeof SQLITE_TYPE_VALUES)[number];

/** Single source of truth: schema drives both runtime validation and ColumnOptions<T>. */
const COLUMN_OPTIONS_SCHEMA = {
    /** Default value or factory for this column (value or () => value). */
    default: { required: true as const },
    /** SQLite type for schema generation (virtual columns, FTS). */
    type: { required: true as const, type: 'string' as const, enum: SQLITE_TYPE_VALUES },
    /** Optional length for varchar/char; emitted as VARCHAR(n) or CHAR(n) in DDL. Must be positive integer when set. */
    length: { required: false as const, type: 'number' as const, integer: true, min: 1 },
    /** Name of a registered transformer (e.g. 'date'). */
    as: { required: false as const, type: 'string' as const },
    /** Create virtual column for SQL indexing (WHERE / ORDER BY). */
    index: { required: false as const, type: 'boolean' as const },
    /** Create FTS5 column for full-text search. */
    fullText: { required: false as const, type: 'boolean' as const },
    /** When fullText and as:'json': JSON path within each array element to index (e.g. '$.text' for transcript segments). Omit to index raw value. */
    fullTextPath: { required: false as const, type: 'string' as const },
} satisfies OptionsSchema;

export type ColumnOptions<T = unknown> = OptionsFromSchema<
    typeof COLUMN_OPTIONS_SCHEMA,
    {
        default: T | (() => T);
        type: SqliteType;
        length?: number;
        fullTextPath?: string;
    }
>;

class ColumnDecorator implements PropertyDecoratorConfig<ColumnOptions<unknown>> {
    public readonly schema = COLUMN_OPTIONS_SCHEMA;
    public readonly errorCode = 'INVALID_COLUMN_OPTIONS';

    public validate(options: ColumnOptions<unknown>): void {
        if (options.fullText === true && options.as === 'json') {
            const path = options.fullTextPath;
            if (path == null || typeof path !== 'string' || path.trim() === '') {
                throw new DatabaseException(
                    'Column with fullText and as:"json" must specify fullTextPath (e.g. "$.text") so FTS indexes extracted text, not raw JSON.',
                    this.errorCode,
                    undefined,
                    { options },
                );
            }
        }
    }

    public before(context: ClassFieldDecoratorContext<unknown, unknown>, options: ColumnOptions<unknown>): void {
        const meta = context.metadata as Record<string | symbol, unknown> | undefined;
        MetadataWriter.registerProperty(meta, String(context.name), 'Column', options);
    }

    public initializer(context: ClassFieldDecoratorContext<unknown, unknown>, options: ColumnOptions<unknown>): (instance: unknown) => void {
        return (instance: unknown) => {
            const self = instance as AbstractEntity;
            const key = String(context.name);
            const transformer = options.as != null ? TransformerRegistry.get(options.as) : undefined;

            Object.defineProperty(self, key, {
                configurable: true,
                enumerable: true,
                get() {
                    const raw = self.getField(key);
                    return transformer != null ? transformer.fromStorage(raw) : raw;
                },
                set(value: unknown) {
                    const stored = transformer != null ? transformer.toStorage(value) : value;
                    self.setField(key, stored);
                },
            });
        };
    }
}

export const Column = Builder.buildProperty(new ColumnDecorator());
