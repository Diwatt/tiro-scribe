/**
 * Schema – Zod schemas, inferred types, and default form data for the onboarding wizard.
 */

import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;

export class Schema {
    public static readonly defaults: z.infer<typeof Schema.form> = {
        languages: ['fr'],
        qualifications: [],
        experience: '',
        methods: [],
        email: '',
        password: '',
        confirmPassword: '',
        recoveryCodeSaveConfirmed: false,
    };

    public static readonly formBase = z.object({
        languages: z.array(z.string()).min(1, 'Please select at least one language.'),
        qualifications: z.array(z.string()).min(1, 'Please select at least one qualification.'),
        experience: z
            .string()
            .min(1, 'Please enter years of experience.')
            .transform((s) => s.trim())
            .refine((v) => /^\d+$/.test(v), 'Enter a number.'),
        methods: z.array(z.string()).min(1, 'Please select at least one method.'),
        email: z.string().trim().min(1, 'Please enter your email.').email('Invalid email address.'),
        password: z.string().min(PASSWORD_MIN_LENGTH, 'Password must be at least 8 characters.'),
        confirmPassword: z.string(),
        recoveryCodeSaveConfirmed: z.boolean().optional(),
    });

    public static readonly form = Schema.formBase.refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
    });
}

export type OnboardingFormData = z.infer<typeof Schema.form>;
