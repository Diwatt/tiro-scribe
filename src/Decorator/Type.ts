/**
 * Types for decorator option schemas and OptionsFromSchema derivation.
 * Used by SchemaValidator (runtime) and by decorators (Column, Entity) for typed options.
 */

/** Allowed schema type names. Omit type in OptionFieldSchema to allow any value (no type check). */
export type OptionFieldType = 'string' | 'number' | 'boolean' | 'function' | 'object';

/** Composition type: union of OptionFieldType. Value is valid if it matches one of the types. */
export type OptionFieldTypeComposition = readonly OptionFieldType[];

/**
 * Declares requirement and type for one option field.
 * Options are optional by default; required defaults to false.
 * Omit type to allow any value; use type (single) or composition (array) to validate.
 */
export interface OptionFieldSchema {
    /** Default false: when true, the option must be isSet. */
    required?: boolean;
    /** When set, validates that the value is one of these types. Use a single type or a composition (array of types). When omitted, any value is allowed. */
    type?: OptionFieldType | OptionFieldTypeComposition;
}

/** Schema for decorator options: key -> OptionFieldSchema. */
export type OptionsSchema = Record<string, OptionFieldSchema>;

/** Maps each schema type name to its TypeScript type. */
type OptionFieldTypeMap = {
    string: string;
    number: number;
    boolean: boolean;
    function: (...args: unknown[]) => unknown;
    object: object;
};

/**
 * Value type for one schema field.
 * If the field has a single type (e.g. type: 'string'), returns the matching TS type; otherwise unknown.
 */
type SchemaFieldValueType<F extends OptionFieldSchema> = F extends { type: infer T }
    ? T extends keyof OptionFieldTypeMap
        ? OptionFieldTypeMap[T]
        : unknown
    : unknown;

/** Value type for key K: from Overrides when set, otherwise from schema. */
type OptionValueType<S extends OptionsSchema, K extends keyof S, O extends Partial<{ [Key in keyof S]: unknown }>> = K extends keyof O
    ? O[K]
    : SchemaFieldValueType<S[K]>;

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
export type OptionsFromSchema<S extends OptionsSchema, Overrides extends Partial<{ [K in keyof S]: unknown }> = object> = RequiredOptionsFromSchema<
    S,
    Overrides
> &
    OptionalOptionsFromSchema<S, Overrides>;

/** Constructor type for class decorator targets. */
export type ClassConstructor = abstract new (...args: any[]) => any;

/** Interface for entity (class) decorators (e.g. Entity). Implement and pass an instance to Builder.buildEntity. */
export interface ClassDecoratorConfig<TOptions = object> {
    /** Run on the class target with options. */
    fn(target: ClassConstructor, context: ClassDecoratorContext<ClassConstructor>, options: TOptions): void;
    /** Optional schema; when set, builder runs schemaValidator.validate before fn. errorCode used for exceptions. */
    schema?: OptionsSchema;
    errorCode?: string;
    /** Custom validate when schema is not enough. Run after schema validation when schema is set. */
    validate?(options: TOptions): void;
}

/** Interface for field decorators (e.g. Column, PrimaryKey). Implement and pass an instance to Builder.buildField. */
export interface FieldDecoratorConfig<TOptions = object> {
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
