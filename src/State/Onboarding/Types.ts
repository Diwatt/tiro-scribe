/**
 * Types – Shared types for onboarding (validation result, etc.).
 */

export type ValidationResult = { success: true } | { success: false; errors: { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> } };
