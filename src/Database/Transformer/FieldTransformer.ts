/**
 * Transforms between entity value and stored value.
 * Register with TransformerRegistry.register(name, transformer); then use as: 'name' on @Column.
 */

export interface FieldTransformer {
    toStorage(value: unknown): unknown;
    fromStorage(value: unknown): unknown;
}
