/**
 * RestoreSchema – Zod schemas, inferred types, and default form data for the vault restore form.
 * The recovery code format is owned by RecoveryCode (alphabet, length, canonicalization).
 */

import { z } from 'zod';
import { RecoveryCode } from '@/Security';

export class RestoreSchema {
    public static readonly defaults: z.infer<typeof RestoreSchema.form> = {
        recoveryCode: '',
        newPassword: '',
        confirmPassword: '',
    };

    public static readonly PASSWORD_MIN_LENGTH = 8;

    public static readonly form = z
        .object({
            recoveryCode: z.string().refine(
                (code) => RecoveryCode.isValidCode(code),
                'Enter the recovery code printed in your kit (XXXX-XXXX-XXXX).',
            ),
            newPassword: z
                .string()
                .min(RestoreSchema.PASSWORD_MIN_LENGTH, 'Password must be at least 8 characters.'),
            confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: 'Passwords do not match.',
            path: ['confirmPassword'],
        });
}

export type RestoreFormData = z.infer<typeof RestoreSchema.form>;
