/**
 * FormValidator – Validation for the onboarding wizard. Uses Schema for form shape.
 */

import type { ZodType } from 'zod';
import type { OnboardingFormData } from './Schema';
import { Schema } from './Schema';
import type { ValidationResult } from './Types';

export type ProfileStepData = Pick<OnboardingFormData, 'languages' | 'qualifications' | 'experience' | 'methods'>;

export type OnboardingValidationScope = 'profile' | 'form';

export class FormValidator {
    public validate(data: OnboardingFormData, scope: OnboardingValidationScope = 'form'): ValidationResult {
        if (scope === 'profile') {
            return this.validateProfile(data);
        }
        return this.runValidation(data, Schema.form);
    }

    public validateProfile(data: ProfileStepData): ValidationResult {
        const profileSchema = Schema.formBase.pick({
            languages: true,
            qualifications: true,
            experience: true,
            methods: true,
        });
        return this.runValidation(data, profileSchema);
    }

    private runValidation(data: unknown, schema: ZodType): ValidationResult {
        const result = schema.safeParse(data);
        if (result.success) {
            return { success: true };
        }
        return { success: false, errors: result.error.flatten() };
    }
}

export const formValidator = new FormValidator();
