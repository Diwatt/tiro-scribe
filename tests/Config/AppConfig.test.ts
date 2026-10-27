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
});
