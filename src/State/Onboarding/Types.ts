/**
 * Types – Shared types for onboarding (validation result, callbacks, step management, etc.).
 */

import type { Therapist } from '@/Entity/Therapist';
import type { AccountCreationResult } from './AccountState';

/**
 * Enum for onboarding steps with type-safe step values.
 * Each step represents a distinct phase in the onboarding wizard.
 */
export enum OnboardingStep {
    Account = 1,
    Profile = 2,
    Voice = 3,
    Recovery = 4,
}

/**
 * Interface for providing access to the pending therapist during onboarding.
 * Implemented by states that need to reference the therapist being created.
 */
export interface PendingTherapistProvider {
    getPendingTherapist(): Therapist | null;
}

/**
 * Interface for providing the clear master password held during onboarding,
 * needed once at finalize to write the database keyfile (cf. docs/AUTH_GATED_BOOT.md).
 */
export interface PendingPasswordProvider {
    getPendingPassword(): string | null;
}

/**
 * Callback interface for handling successful account creation.
 * Called when account creation completes to transition to the next step.
 */
export type AccountSuccessHandler = (result: AccountCreationResult) => void;

export type ValidationResult =
    | { success: true }
    | { success: false; errors: { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> } };
