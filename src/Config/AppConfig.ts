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

    /**
     * API host: origin and optional path (e.g. https://api.example.com or https://api.example.com/api).
     * Override: EXPO_PUBLIC_API_BASE_URL. Used as-is for fetch; path prefix for generated client is derived from this.
     */
    get apiHost(): string {
        return process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
    },

    /**
     * Path prefix the generated API client sends (derived from apiHost).
     * When apiHost already ends with /api, returns ''; otherwise returns '/api' so requests go to origin + /api/...
     */
    get apiRequestPathPrefix(): string {
        const url = this.apiHost.trim().replace(/\/$/, '');
        if (!url) {
            return '/api';
        }
        return url.endsWith('/api') ? '' : '/api';
    },

    /** When true, Storybook UI is available in dev. Override: STORYBOOK_ENABLED=true */
    get isStorybookEnabled(): boolean {
        return process.env.STORYBOOK_ENABLED === 'true';
    },

    /** Directory under document dir where inference artifacts (ONNX) are stored; path = ${artifactStorageDirName}/${artifactId}.onnx. Override: EXPO_PUBLIC_ARTIFACT_STORAGE_SUBDIR */
    get artifactStorageDirName(): string {
        return process.env.EXPO_PUBLIC_ARTIFACT_STORAGE_SUBDIR ?? 'artifacts';
    },
});
