/**
 * Foreign key decorator (field-level): declares a reference to another entity for schema/metadata.
 * Used for DDL and relationship metadata only; no runtime instance wiring.
 *
 * @example
 * @ForeignKey({ target: () => Therapist })
 * @Column({ default: '', type: 'varchar', length: 36 })
 * private therapistId!: string;
 */

import { Builder, type OptionsSchema, type PropertyDecoratorConfig } from '../../Decorator/Builder';
import { MetadataWriter } from '../../Decorator/MetadataWriter';
import type { EntityClassStatic } from '../AbstractEntity';

export enum OnDeleteAction {
    Cascade = 'CASCADE',
    SetNull = 'SET NULL',
    Restrict = 'RESTRICT',
    NoAction = 'NO ACTION',
}

export interface ForeignKeyOptions {
    /** Target entity class. Use () => EntityClass for lazy ref (avoids circular imports), or pass the class directly. */
    target: (() => EntityClassStatic) | EntityClassStatic;
    /** Column name on the target table (e.g. 'uuid'). Default: 'uuid'. */
    column?: string;
    /** Action when the referenced row is deleted. Default: RESTRICT. */
    onDelete?: OnDeleteAction;
}

const FOREIGN_KEY_OPTIONS_SCHEMA = {
    target: { required: true as const, type: 'function' as const },
    column: { required: false as const, type: 'string' as const },
    onDelete: {
        required: false as const,
        type: 'string' as const,
        enum: Object.values(OnDeleteAction),
    },
} satisfies OptionsSchema;

class ForeignKeyDecorator implements PropertyDecoratorConfig<ForeignKeyOptions> {
    public readonly decoratorName = 'ForeignKey';
    public readonly schema = FOREIGN_KEY_OPTIONS_SCHEMA;
    public readonly errorCode = 'INVALID_FOREIGN_KEY_OPTIONS';

    public before(context: ClassFieldDecoratorContext<unknown, unknown>, options: ForeignKeyOptions): void {
        const meta = context.metadata as Record<string | symbol, unknown> | undefined;
        MetadataWriter.registerField(meta, String(context.name), 'ForeignKey', options);
    }

    public initializer(_context: ClassFieldDecoratorContext<unknown, unknown>, _options: ForeignKeyOptions): (instance: unknown) => void {
        return () => {
            /* no-op: metadata only, no instance wiring */
        };
    }
}

export const ForeignKey = Builder.buildField(new ForeignKeyDecorator());
