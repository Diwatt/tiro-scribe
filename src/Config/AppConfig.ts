/**
 * Central app config: all env-driven and default values live here.
 * Override via .env (EXPO_PUBLIC_* inlined by Expo at build).
 * Single code path for "need hardcoded config" – no process.env elsewhere in app code.
 */

export const AppConfig = Object.freeze({
    /** SQLite database file name. Override: EXPO_PUBLIC_DATABASE_NAME */
    get databaseName(): string {
        return process.env.EXPO_PUBLIC_DATABASE_NAME ?? 'tiro-scribe.sqlite';
    },

    /** API base URL for Orval/fetch. Override: EXPO_PUBLIC_API_BASE_URL */
    get apiBaseUrl(): string {
        return process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
    },

    /** When true, Storybook UI is available in dev. Override: STORYBOOK_ENABLED=true */
    get isStorybookEnabled(): boolean {
        return process.env.STORYBOOK_ENABLED === 'true';
    },
});
