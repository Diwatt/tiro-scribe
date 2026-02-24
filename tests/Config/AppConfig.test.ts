import { AppConfig } from '@/Config/AppConfig';


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

    it('parses "true" string as true and other values as false', () => {
        process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH = 'true';
        let cfg = new AppConfig();
        expect(cfg.shouldClearDbOnLaunch).toBe(true);

        process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH = 'TRUE';
        cfg = new AppConfig();
        expect(cfg.shouldClearDbOnLaunch).toBe(false);

        process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH = 'false';
        cfg = new AppConfig();
        expect(cfg.shouldClearDbOnLaunch).toBe(false);
    });

    it('uses cached parsed value (same object) when called multiple times', () => {
        process.env.EXPO_PUBLIC_CLEAR_DB_ON_LAUNCH = 'true';
        const cfg = new AppConfig();
        expect(cfg.shouldClearDbOnLaunch).toBe(true);
        // ensure reading again gives same result (config object is not re-parsed)
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
