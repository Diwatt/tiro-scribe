/**
 * Central app config: all env-driven and default values live here.
 * Override via .env (EXPO_PUBLIC_* inlined by Expo at build).
 * Single code path for "need hardcoded config" – no process.env elsewhere in app code.
 * Zod validation runs only when __DEV__ (Metro/dev build). In prod, env is already baked in by Expo.
 */

import { Platform } from 'react-native';
import { z } from 'zod';

const ENV_SCHEMA = z.object({
    // biome-ignore lint/style/useNamingConvention: environment variable name
    EXPO_PUBLIC_API_BASE_URL: z
        .string()
        .trim()
        .optional()
        .default('https://api.tiro.com')
        .refine((s) => s.length > 0, 'EXPO_PUBLIC_API_BASE_URL is required')
        .refine((s) => !s.endsWith('/'), {
            message: 'EXPO_PUBLIC_API_BASE_URL must not end with a slash',
        })
        // rewrite localhost for android emulator during schema parsing
        .transform((s) => {
            let url = s;
            const testOs = process.env.__TEST_PLATFORM_OS__;
            const os: string | undefined = testOs ?? Platform?.OS;
            if (os === 'android' && url.includes('localhost')) {
                url = url.replace('localhost', '10.0.2.2');
            }
            return url;
        }),
    // biome-ignore lint/style/useNamingConvention: environment variable name
    EXPO_PUBLIC_DATABASE_NAME: z.string().trim().optional().default('tiro-scribe.sqlite'),
    // biome-ignore lint/style/useNamingConvention: environment variable name
    STORYBOOK_ENABLED: z
        .string()
        .optional()
        .default('')
        .transform((s) => s === 'true'),
    // biome-ignore lint/style/useNamingConvention: environment variable name
    EXPO_PUBLIC_ARTIFACT_STORAGE_SUBDIR: z.string().trim().optional().default('artifacts'),
    // biome-ignore lint/style/useNamingConvention: environment variable name
    EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH: z
        .string()
        .optional()
        .default('false')
        .transform((s) => s === 'true'),
    // biome-ignore lint/style/useNamingConvention: environment variable name
    EXPO_PUBLIC_PROJECTION_SALT: z.string().trim().optional().default('biocode_projection'),
});

type EnvConfig = z.output<typeof ENV_SCHEMA>;

export class AppConfig {
    private readonly config: EnvConfig;

    public constructor() {
        this.config = AppConfig.parseEnv();
    }

    public get apiHost(): string {
        return this.config.EXPO_PUBLIC_API_BASE_URL;
    }

    public get artifactStorageDirName(): string {
        return this.config.EXPO_PUBLIC_ARTIFACT_STORAGE_SUBDIR;
    }

    public get databaseName(): string {
        return this.config.EXPO_PUBLIC_DATABASE_NAME;
    }

    public get isDev(): boolean {
        return __DEV__;
    }

    public get isStorybookEnabled(): boolean {
        return this.isDev && this.config.STORYBOOK_ENABLED;
    }

    public get projectionSalt(): string {
        return this.config.EXPO_PUBLIC_PROJECTION_SALT;
    }

    /**
     * When true, the app will delete and re‑create its local database on every
     * cold start. Intended for development and controlled via the
     * EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH env var (string "true"/"false").
     */
    public get shouldClearDbOnLaunch(): boolean {
        return this.config.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH;
    }

    private static parseEnv(): EnvConfig {
        if (__DEV__) {
            return ENV_SCHEMA.parse(process.env);
        }

        return {
            // biome-ignore lint/style/useNamingConvention: environment variable name
            EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
            // biome-ignore lint/style/useNamingConvention: environment variable name
            EXPO_PUBLIC_DATABASE_NAME: process.env.EXPO_PUBLIC_DATABASE_NAME ?? 'tiro-scribe.sqlite',
            // biome-ignore lint/style/useNamingConvention: environment variable name
            STORYBOOK_ENABLED: process.env.STORYBOOK_ENABLED === 'true',
            // biome-ignore lint/style/useNamingConvention: environment variable name
            EXPO_PUBLIC_ARTIFACT_STORAGE_SUBDIR: process.env.EXPO_PUBLIC_ARTIFACT_STORAGE_SUBDIR ?? 'artifacts',
            // biome-ignore lint/style/useNamingConvention: environment variable name
            EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH: process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH === 'true',
            // biome-ignore lint/style/useNamingConvention: environment variable name
            EXPO_PUBLIC_PROJECTION_SALT: process.env.EXPO_PUBLIC_PROJECTION_SALT ?? 'biocode_projection',
        };
    }
}
