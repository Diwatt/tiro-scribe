/**
 * Registry of named transformers for column `as`.
 * Use TransformerRegistry.register('pifpaf', myTransformer) then as: 'pifpaf' on @Column.
 */

import { DateTransformer } from './DateTransformer';
import type { FieldTransformer } from './FieldTransformer';
import { JsonTransformer } from './JsonTransformer';

export class TransformerRegistry {
    private static readonly registryMap = new Map<string, FieldTransformer>();

    public static get(name: string): FieldTransformer | undefined {
        return TransformerRegistry.registryMap.get(name);
    }

    public static register(name: string, transformer: FieldTransformer): void {
        TransformerRegistry.registryMap.set(name, transformer);
    }

    /** Remove a registered transformer (e.g. for test cleanup). */
    public static unregister(name: string): void {
        TransformerRegistry.registryMap.delete(name);
    }
}

TransformerRegistry.register('date', new DateTransformer());
TransformerRegistry.register('json', new JsonTransformer());
