/**
 * Type-level key case conversion for API layer (snake_case → camelCase). Use to derive types from generated schemas without duplicating shapes.
 */

/** snake_case key → camelCase (type-level). */
type CamelCase<S extends string> = S extends `${infer A}_${infer B}` ? `${A}${Capitalize<CamelCase<B>>}` : S;

/** Object with all keys converted to camelCase. */
export type CamelCaseKeys<T> = { [K in keyof T as CamelCase<K & string>]: T[K] };

/**
 * Pick keys from the camelCase version of T. Single generic for "subset of T with camelCase keys".
 * @example type Resolved = PickedCamelCase<ModelArtifactVariant, 'id' | 'version' | 'url' | 'hash' | 'sizeBytes' | 'minAppVersion'> & { useCase: string };
 */
export type PickedCamelCase<T, K extends keyof CamelCaseKeys<T>> = Pick<CamelCaseKeys<T>, K>;
