import { AppConfig } from '@/Core/AppConfig';

describe('AppConfig', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('defaults clearDB flag to false when not set', () => {
        delete process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH;
        const cfg = new AppConfig();
        expect(cfg.shouldClearDbOnLaunch).toBe(false);
    });

    it.each([
        ['true', true],
        ['TRUE', false],
        ['false', false],
    ])('parses EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH=%s as %s', (envValue, expected) => {
        process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH = envValue;
        const cfg = new AppConfig();
        expect(cfg.shouldClearDbOnLaunch).toBe(expected);
    });

    it('freezes the parsed value at construction (env changes afterwards have no effect)', () => {
        process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH = 'true';
        const cfg = new AppConfig();
        expect(cfg.shouldClearDbOnLaunch).toBe(true);

        process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH = 'false';
        expect(cfg.shouldClearDbOnLaunch).toBe(true);
    });

    describe('apiHost helper', () => {
        afterEach(() => {
            process.env.EXPO_PUBLIC_API_BASE_URL = undefined;
            delete process.env.__TEST_PLATFORM_OS__;
        });

        it('returns same URL on non-android platforms', () => {
            process.env.__TEST_PLATFORM_OS__ = 'ios';

            process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3000';
            const cfg = new AppConfig();
            expect(cfg.apiHost).toBe('http://localhost:3000');

            process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.com';
            const cfg2 = new AppConfig();
            expect(cfg2.apiHost).toBe('https://example.com');
        });

        it('rewrites localhost to 10.0.2.2 on android emulator', () => {
            process.env.__TEST_PLATFORM_OS__ = 'android';

            process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3000';
            const cfg = new AppConfig();
            expect(cfg.apiHost).toBe('http://10.0.2.2:3000');
        });
    });

    describe('prod path (__DEV__ false, env already baked in by Expo)', () => {
        // SAFETY: babel-preset-expo (plugins/inline-env-vars.js:47) inlines every
        // process.env.EXPO_PUBLIC_* read at transform time, so under jest the prod branch
        // of parseEnv always sees its fallbacks. Runtime process.env mutations only reach
        // the dev branch (zod parses the whole process.env object dynamically).
        beforeEach(() => {
            (global as unknown as { __DEV__: boolean }).__DEV__ = false;
            delete process.env.EXPO_PUBLIC_API_BASE_URL;
            delete process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH;
            delete process.env.STORYBOOK_ENABLED;
        });

        afterEach(() => {
            (global as unknown as { __DEV__: boolean }).__DEV__ = true;
        });

        it('defaults apiHost to empty string (dev zod default not applied)', () => {
            const cfg = new AppConfig();
            expect(cfg.apiHost).toBe('');
        });

        it.skip('keeps the baked EXPO_PUBLIC_API_BASE_URL as-is on android (dev-only rewrite skipped)', () => {
            // Untestable under jest: EXPO_PUBLIC_* values are inlined by babel-preset-expo at
            // transform time, so setting process.env at runtime never reaches the prod branch
            // (the branch exists in real prod builds; it always reads as unset here).
            process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3000';
            process.env.__TEST_PLATFORM_OS__ = 'android';
            const cfg = new AppConfig();
            expect(cfg.apiHost).toBe('http://localhost:3000');
        });

        it('defaults shouldClearDbOnLaunch to false when EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH is not baked', () => {
            const cfg = new AppConfig();
            expect(cfg.shouldClearDbOnLaunch).toBe(false);
        });

        it('disables storybook in prod (isDev short-circuits the getter)', () => {
            const cfg = new AppConfig();
            expect(cfg.isStorybookEnabled).toBe(false);
        });

        it('defaults databaseName to tiro-scribe.sqlite', () => {
            const cfg = new AppConfig();
            expect(cfg.databaseName).toBe('tiro-scribe.sqlite');
        });

        it('defaults artifactStorageDirName to artifacts', () => {
            const cfg = new AppConfig();
            expect(cfg.artifactStorageDirName).toBe('artifacts');
        });

        it('defaults projectionSalt to biocode_projection', () => {
            const cfg = new AppConfig();
            expect(cfg.projectionSalt).toBe('biocode_projection');
        });

        it('defaults voiceCalibrationDurationMs to 5000 when EXPO_PUBLIC_VOICE_CALIBRATION_DURATION_MS is not baked', () => {
            const cfg = new AppConfig();
            expect(cfg.voiceCalibrationDurationMs).toBe(5000);
        });
    });
});
