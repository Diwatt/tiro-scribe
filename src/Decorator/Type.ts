/**
 * Types for decorator option schemas and OptionsFromSchema derivation.
 * Used by SchemaValidator (runtime) and by decorators (Column, Entity) for typed options.
 */

/** Allowed schema type names. Omit type in OptionPropertySchema to allow any value (no type check). */
export type OptionPropertyType = 'string' | 'number' | 'boolean' | 'function' | 'object';

/** Composition type: union of OptionPropertyType. Value is valid if it matches one of the types. */
export type OptionPropertyTypeComposition = readonly OptionPropertyType[];

/**
 * Declares requirement and type for one option property.
 * Options are optional by default; required defaults to false.
 * Omit type to allow any value; use type (single) or composition (array) to validate.
 * Use enum to restrict string values to a fixed set (runtime validation).
 * SchemaValidator applies optional constraints: notBlank (string), integer/min (number).
 */
export interface OptionPropertySchema {
    /** Default false: when true, the option must be isSet. */
    required?: boolean;
    /** When set, validates that the value is one of these types. Use a single type or a composition (array of types). When omitted, any value is allowed. */
    type?: OptionPropertyType | OptionPropertyTypeComposition;
    /** When set (with type 'string'), validates that the value is one of these string literals. */
    enum?: readonly string[];
    /** When true with type 'string', value must be not blank (non-empty after trim). Applied by SchemaValidator. */
    notBlank?: boolean;
    /** When true with type 'number', value must be an integer. Applied by SchemaValidator. */
    integer?: boolean;
    /** When set with type 'number', value must be >= min. Applied by SchemaValidator. */
    min?: number;
}

/** Schema for decorator options: key -> OptionPropertySchema. */
export type OptionsSchema = Record<string, OptionPropertySchema>;

/** Maps each schema type name to its TypeScript type. */
type OptionPropertyTypeMap = {
    string: string;
    number: number;
    boolean: boolean;
    function: (...args: unknown[]) => unknown;
    object: object;
};

/**
 * Value type for one schema property.
 * If the property has a single type (e.g. type: 'string'), returns the matching TS type; otherwise unknown.
 */
type SchemaFieldValueType<F extends OptionPropertySchema> = F extends { type: infer T }
    ? T extends keyof OptionPropertyTypeMap
        ? OptionPropertyTypeMap[T]
        : unknown
    : unknown;

/** Value type for key K: from Overrides when set, otherwise from schema. */
type OptionValueType<
    S extends OptionsSchema,
    K extends keyof S,
    O extends Partial<{ [Key in keyof S]: unknown }>,
> = K extends keyof O ? O[K] : SchemaFieldValueType<S[K]>;

/** Required keys only: those with required: true in the schema. */
type RequiredOptionsFromSchema<S extends OptionsSchema, O extends Partial<{ [Key in keyof S]: unknown }>> = {
    [K in keyof S as S[K] extends { required: true } ? K : never]: OptionValueType<S, K, O>;
};

/** Optional keys only: those without required: true. */
type OptionalOptionsFromSchema<S extends OptionsSchema, O extends Partial<{ [Key in keyof S]: unknown }>> = {
    [K in keyof S as S[K] extends { required: true } ? never : K]?: OptionValueType<S, K, O>;
};

/**
 * Derives an options interface from a schema.
 * Use Overrides to give custom types for specific keys (e.g. default: T | (() => T)).
 */
export type OptionsFromSchema<
    S extends OptionsSchema,
    Overrides extends Partial<{ [K in keyof S]: unknown }> = object,
> = RequiredOptionsFromSchema<S, Overrides> & OptionalOptionsFromSchema<S, Overrides>;

// Constructor type for class decorator targets was previously exported
// here.  We no longer provide a public alias – any database-specific code
// should use `typeof AbstractEntity` where appropriate, and the decorator
// package files declare their own local constructor type when they need it.

// Internal helper used only within this file for typing decorator interfaces.
type InternalClassConstructor = abstract new (...args: unknown[]) => unknown;

/** Minimal shape for metadata reading (name + indexable). Accepts class constructors without cast. */
export type MetadataConstructor = { name?: string };

/**
 * Single decorator entry stored in Symbol.metadata or weak map helpers.
 * Used by MetadataReader/Writer and database decorator logic.
 */
export interface DecoratorMetadata {
    decoratorName: string;
    options: unknown;
}

/**
 * Per-field metadata container used by the decorator helpers above.
 */
export type FieldMetadata = { decorators?: DecoratorMetadata[] };

/**
 * Convenience alias for the raw metadata object shape attached to constructors.
 */
export type MetadataMap = Record<string, FieldMetadata>;

/** Interface for class decorators (formerly "entity" in comments) (e.g. Entity). Implement and pass an instance to Builder.buildClass. */
export interface ClassDecoratorConfig<TOptions = object> {
    /** Run when the decorator is applied to the class (target, context, options). */
    decorate(
        target: InternalClassConstructor,
        context: ClassDecoratorContext<InternalClassConstructor>,
        options: TOptions,
    ): void;
    /** Optional schema; when set, builder runs schemaValidator.validate before decorate. errorCode used for exceptions. */
    schema?: OptionsSchema;
    errorCode?: string;
    /** Custom validate when schema is not enough. Run after schema validation when schema is set. */
    validate?(options: TOptions): void;
}

/** Interface for property decorators (e.g. Column, PrimaryKey). Implement and pass an instance to Builder.buildProperty. */
export interface PropertyDecoratorConfig<TOptions = object> {
    /** Optional schema; when set, builder runs schemaValidator.validate before before/initializer. errorCode used for exceptions. */
    schema?: OptionsSchema;
    errorCode?: string;
    /** Custom validate when schema is not enough. Run after schema validation when schema is set. */
    validate?(options: TOptions): void;
    /** Run synchronously when the decorator is applied (e.g. set metadata). */
    before?(context: ClassFieldDecoratorContext<unknown, unknown>, options: TOptions): void;
    /** Run in addInitializer (instance is `this`). */
    initializer(context: ClassFieldDecoratorContext<unknown, unknown>, options: TOptions): (instance: unknown) => void;
    /**
     * When true, only one property of the same class can have this decorator.
     * Requires decoratorName so the builder can check metadata. Used by @PrimaryKey.
     */
    unique?: boolean;
    /** Name of this decorator in metadata (e.g. 'PrimaryKey', 'Column'). Required when unique is true. */
    decoratorName?: string;
}
