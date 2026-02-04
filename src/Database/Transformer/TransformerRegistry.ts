/**
 * Registry of named transformers for column `as`.
 * Use TransformerRegistry.register('pifpaf', myTransformer) then as: 'pifpaf' on @Column.
 */

import { DateTransformer } from './DateTransformer';
import { JsonTransformer } from './JsonTransformer';
import type { FieldTransformer } from './FieldTransformer';

export class TransformerRegistry {
    private static readonly _registry = new Map<string, FieldTransformer>();

    public static register(name: string, transformer: FieldTransformer): void {
        this._registry.set(name, transformer);
    }

    public static get(name: string): FieldTransformer | undefined {
        return this._registry.get(name);
    }

    /** Remove a registered transformer (e.g. for test cleanup). */
    public static unregister(name: string): void {
        this._registry.delete(name);
    }
}

TransformerRegistry.register('date', new DateTransformer());
TransformerRegistry.register('json', new JsonTransformer());