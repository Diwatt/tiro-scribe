/**
 * Primary key decorator (field-level): marks a specific column as the primary key.
 * Only a single primary key per entity is supported.
 *
 * @example
 * @PrimaryKey()
 * @Column({ default: () => crypto.randomUUID() })
 * public uuid!: string;
 */

import { Builder, type PropertyDecoratorConfig } from '../../Decorator/Builder';
import { MetadataWriter } from '../../Decorator/MetadataWriter';

class PrimaryKeyDecorator implements PropertyDecoratorConfig<Record<string, never>> {
    public readonly unique = true;
    public readonly decoratorName = 'PrimaryKey';

    public before(context: ClassFieldDecoratorContext<unknown, unknown>, _options: Record<string, never>): void {
        const meta = context.metadata as Record<string | symbol, unknown> | undefined;
        MetadataWriter.registerField(meta, String(context.name), 'PrimaryKey', {});
    }

    public initializer(_context: ClassFieldDecoratorContext<unknown, unknown>, _options: Record<string, never>): (instance: unknown) => void {
        return () => {
            /* no-op: decorator does not mutate instance */
        };
    }
}

export const PrimaryKey = Builder.buildField(new PrimaryKeyDecorator());
