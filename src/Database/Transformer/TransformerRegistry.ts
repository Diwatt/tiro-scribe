/**
 * Registry of named transformers for column `as`.
 * Use TransformerRegistry.register('pifpaf', myTransformer) then as: 'pifpaf' on @Column.
 */

import { DateTransformer } from './DateTransformer';
import type { FieldTransformer } from './FieldTransformer';
import { JsonTransformer } from './JsonTransformer';

// biome-ignore lint/complexity/noStaticOnlyClass: registry pattern with static API
export class TransformerRegistry {
    private static readonly _registry = new Map<string, FieldTransformer>();

    public static get(name: string): FieldTransformer | undefined {
        return TransformerRegistry._registry.get(name);
    }

    public static register(name: string, transformer: FieldTransformer): void {
        TransformerRegistry._registry.set(name, transformer);
    }

    /** Remove a registered transformer (e.g. for test cleanup). */
    public static unregister(name: string): void {
        TransformerRegistry._registry.delete(name);
    }
}

TransformerRegistry.register('date', new DateTransformer());
TransformerRegistry.register('json', new JsonTransformer());
