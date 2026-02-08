/**
 * Column decorator: use on a property declaration. Registers default in metadata and wires the property
 * to the observable store (get/set delegate to getField/setField). With as: 'date' uses Date API.
 *
 * For each @Column() field "foo" you get:
 * - this.foo / this.foo = x — value access (through _state$, observability preserved).
 * - this.foo$ — observable node for reactive subscriptions (observer, useSelector).
 *
 * @example
 * @Column({ default: () => crypto.randomUUID() })
 * public uuid!: string;
 * // then: this.uuid, this.uuid = x, and this.uuid$ for reactivity.
 */

import { Builder, type FieldDecoratorConfig, type OptionsFromSchema, type OptionsSchema } from '../Decorator/Builder';
import { MetadataWriter } from '../Decorator/MetadataWriter';
import type { AbstractEntity } from './AbstractEntity';
import { TransformerRegistry } from './Transformer';

/** Single source of truth: schema drives both runtime validation and ColumnOptions<T>. */
const COLUMN_OPTIONS_SCHEMA = {
    /** Default value or factory for this column (value or () => value). */
    default: { required: true as const },
    /** Name of a registered transformer (e.g. 'date'). */
    as: { required: false as const, type: 'string' as const },
} satisfies OptionsSchema;

export type ColumnOptions<T = unknown> = OptionsFromSchema<typeof COLUMN_OPTIONS_SCHEMA, { default: T | (() => T) }>;

class ColumnDecorator implements FieldDecoratorConfig<ColumnOptions<unknown>> {
    public readonly schema = COLUMN_OPTIONS_SCHEMA;
    public readonly errorCode = 'INVALID_COLUMN_OPTIONS';

    public before(context: ClassFieldDecoratorContext<unknown, unknown>, options: ColumnOptions<unknown>): void {
        const meta = context.metadata as Record<string | symbol, unknown> | undefined;
        MetadataWriter.registerField(meta, String(context.name), 'Column', options);
    }

    public initializer(context: ClassFieldDecoratorContext<unknown, unknown>, options: ColumnOptions<unknown>): (instance: unknown) => void {
        return (instance: unknown) => {
            const self = instance as AbstractEntity;
            const key = String(context.name);
            const transformer = options.as != null ? TransformerRegistry.get(options.as) : undefined;

            // Value accessor: this.therapistId / this.therapistId = x — delegates to getField/setField (_state$) so observability is preserved.
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

            // Observable accessor: this.therapistId$ — for reactive subscriptions (observer, useSelector).
            const observableKey = `${key}$`;
            Object.defineProperty(self, observableKey, {
                configurable: true,
                enumerable: false,
                get() {
                    return self.field$(key);
                },
            });
        };
    }
}

export const Column = Builder.buildField(new ColumnDecorator());
