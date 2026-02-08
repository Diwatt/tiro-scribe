/**
 * Schema – Zod schemas, inferred types, and default form data for onboarding.
 */

import { z } from 'zod';

const onboardingBaseSchema = z.object({
    languages: z.array(z.string()).min(1, 'Please select at least one language.'),
    qualifications: z.array(z.string()).min(1, 'Please select at least one qualification.'),
    experience: z
        .string()
        .min(1, 'Please enter years of experience.')
        .transform((s) => s.trim())
        .refine((v) => /^\d+$/.test(v), 'Enter a number.'),
    methods: z.array(z.string()).min(1, 'Please select at least one method.'),
    email: z
        .string()
        .min(1, 'Please enter your email.')
        .transform((s) => s.trim())
        .pipe(z.string().email('Invalid email address.')),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
    savedCodeChecked: z.boolean().optional(),
});

export const onboardingSchema = onboardingBaseSchema.refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

/** For step 1 only (profile). */
export const profileSchema = onboardingBaseSchema.pick({
    languages: true,
    qualifications: true,
    experience: true,
    methods: true,
});

export type ProfileStepData = z.infer<typeof profileSchema>;

export const defaultOnboardingFormData: OnboardingFormData = {
    languages: ['fr'],
    qualifications: [],
    experience: '',
    methods: [],
    email: '',
    password: '',
    confirmPassword: '',
    savedCodeChecked: false,
};
