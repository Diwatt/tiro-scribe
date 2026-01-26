/**
 * Stage 3 decorators for AbstractEntity schema: entity name and field defaults.
 * Uses TypeScript 5.2+ decorator metadata (context.metadata / Symbol.metadata).
 * No automatic property wiring: entities must declare get/set (and optionally field$ when observable: true).
 */

type ClassConstructor = abstract new (...args: any[]) => any;

/** Default value or factory. Factories are called at entity creation time. */
export type DefaultValue<T = unknown> = T | (() => T);

/** Metadata key used to store the primary key field name on the constructor. */
export const PRIMARY_KEY_META_KEY = '__primaryKey';

export interface EntityOptions {
    /** Table name used for persistence (Registry / Repository). */
    table_name: string;
    /**
     * Optional extra defaults that can't be expressed as fields.
     * Merged with field-level @Column defaults.
     */
    defaults?: Record<string, DefaultValue>;
}

/**
 * Class decorator: sets the entity/table name for Registry and persistence.
 *
 * @example
 * @Entity({ table_name: 'encounters' })
 * class Encounter extends AbstractEntity { ... }
 */
export function Entity(options: EntityOptions) {
    return function <Class extends ClassConstructor>(
        target: Class,
        _context: ClassDecoratorContext<Class>,
    ): Class {
        (target as typeof target & { entityName: string }).entityName = options.table_name;
        if (options.defaults != null) {
            (target as typeof target & { __entityExtraDefaults?: Record<string, DefaultValue> })
                .__entityExtraDefaults = options.defaults;
        }
        return target;
    };
}

export interface ColumnOptions<T> {
    /** Default value or factory for this column. */
    default: DefaultValue<T>;
    /**
     * When 'date': stored as timestamp (number); dev uses get/set with Date and converts via field$.get() / field$.set(v.getTime()).
     */
    as?: 'date';
    /**
     * When true, a getter `fieldName$` is added that returns this._state$[fieldName] (Legend-State node).
     * Dev writes get fieldName() / set fieldName() using fieldName$.get() / fieldName$.set().
     */
    observable?: boolean;
}

/** Entity instance shape needed for Column wiring (getField, setField, field$). */
type EntityWithStore = {
    getField(key: string): unknown;
    setField(key: string, value: unknown): void;
    field$(key: string): unknown;
};

/**
 * Column decorator: use on a property declaration. Registers default in metadata and wires the property
 * to the observable store (get/set delegate to getField/setField). With as: 'date' uses Date API; with observable: true adds fieldName$.
 *
 * @example
 * @Column({ default: () => crypto.randomUUID() })
 * public uuid!: string;
 *
 * @Column({ default: () => Date.now(), as: 'date', observable: true })
 * public createdAt!: Date;
 */
export function Column<T>(options: ColumnOptions<T>) {
    return function (
        _initialValue: unknown,
        context: ClassFieldDecoratorContext<unknown, unknown>,
    ): void {
        const meta = context.metadata as Record<string | symbol, unknown> | undefined;
        if (meta && typeof meta === 'object') {
            meta[context.name] = options.default;
        }

        context.addInitializer(function (this: EntityWithStore) {
            const key = String(context.name);
            const asDate = options.as === 'date';
            const withObservable = options.observable === true;

            Object.defineProperty(this, key, {
                configurable: true,
                enumerable: true,
                get() {
                    const raw = this.getField(key);
                    return asDate ? (raw != null ? new Date(raw as number) : raw) : raw;
                },
                set(value: unknown) {
                    this.setField(key, asDate && value instanceof Date ? value.getTime() : value);
                },
            });

            if (withObservable) {
                const $key = `${key}$`;
                Object.defineProperty(this, $key, {
                    configurable: true,
                    enumerable: true,
                    get() {
                        return this.field$(key);
                    },
                });
            }
        });
    };
}

/**
 * Primary key decorator (field-level): marks a specific column as the primary key.
 *
 * This is a field decorator. It records the field name on the constructor so that
 * AbstractEntity can resolve it without hard-coding \"uuid\".
 *
 * Only a single primary key per entity is supported. Declaring more than one
 * will throw at runtime the first time an instance is constructed.
 *
 * @example
 * @Entity({ table_name: 'encounters' })
 * export class Encounter extends AbstractEntity {
 *     @PrimaryKey()
 *     @Column({ default: () => crypto.randomUUID() })
 *     public uuid!: string;
 * }
 */
export function PrimaryKey() {
    return function (
        _initialValue: unknown,
        context: ClassFieldDecoratorContext<unknown, unknown>,
    ): void {
        context.addInitializer(function (this: InstanceType<ClassConstructor>) {
            const ctor = this.constructor as ClassConstructor & {
                [PRIMARY_KEY_META_KEY]?: string;
            };
            const fieldName = String(context.name);

            if (
                ctor[PRIMARY_KEY_META_KEY] !== undefined &&
                ctor[PRIMARY_KEY_META_KEY] !== fieldName
            ) {
                throw new Error(
                    `Multiple primary keys are not supported (already have "${String(
                        ctor[PRIMARY_KEY_META_KEY],
                    )}", tried to add "${fieldName}")`,
                );
            }

            ctor[PRIMARY_KEY_META_KEY] = fieldName;
        });
    };
}

function resolveValue(v: unknown): unknown {
    return typeof v === 'function' ? (v as () => unknown)() : v;
}

/** Build defaults from class decorator metadata + Entity extraDefaults; resolve factories. */
export function getDefaultsFromMetadata(
    constructor: Function,
): Record<string, unknown> | undefined {
    const ctor = constructor as unknown as Record<symbol | string, unknown> & {
        __entityExtraDefaults?: Record<string, DefaultValue>;
    };
    const meta = ctor[Symbol.metadata as symbol] as Record<string, unknown> | undefined;
    const extra = ctor.__entityExtraDefaults;
    const out: Record<string, unknown> = {};
    if (meta && typeof meta === 'object') {
        for (const [key, value] of Object.entries(meta)) {
            out[key] = resolveValue(value);
        }
    }
    if (extra && typeof extra === 'object') {
        for (const [key, value] of Object.entries(extra)) {
            out[key] = resolveValue(value);
        }
    }
    return Object.keys(out).length ? out : undefined;
}

/** Resolve the primary key field name for a given entity constructor, if any. */
export function getPrimaryKeyName(constructor: Function): string | undefined {
    const ctor = constructor as unknown as Record<string | symbol, unknown>;
    const pk = ctor[PRIMARY_KEY_META_KEY];
    return typeof pk === 'string' ? pk : undefined;
}
