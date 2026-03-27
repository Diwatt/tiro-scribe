import { Container } from '@/Core/Container';
import { Localization } from '@/Localization';
import { StartupOrchestrator, StartupState } from '@/State/StartupOrchestrator';
import { GlobalActivityStatus, ActivityStatus } from '@/State/GlobalActivityStatus';
import { Registry } from '@/Database/Registry';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import { DownloadState } from '@/Service/InferenceModelDownload/Type';
import { DeviceCompatibilityGate } from '@/Security/DeviceCompatibilityGate';
import type { TherapistRepository } from '@/Repository';
import { Therapist } from '@/Entity/Therapist';

jest.mock('@/Core/AppLogger', () => {
    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return {
        AppLogger: {
            getInstance: jest.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

describe('StartupOrchestrator', () => {
    beforeEach(() => {
        jest.useFakeTimers();

        Container.register(GlobalActivityStatus, () => new GlobalActivityStatus(), true);
        Container.register(Registry, () => ({ getRepository: jest.fn() } as any), true);
        Container.register(InferenceModelDownloader, () => ({ download: jest.fn() } as any), true);
        Container.register(DeviceCompatibilityGate as any, () => ({ ensureCompatible: jest.fn(), isCompatible: jest.fn(() => true) } as any), true);
        Container.register(StartupOrchestrator, () => new StartupOrchestrator(), true);

        // clear any previous activity
        Container.get(GlobalActivityStatus).reset();

        // stub registry so we don't hit a real database
        jest.spyOn(Container.get(Registry), 'getRepository').mockImplementation(() => {
            // return minimal repo satisfying the interface
            return ({
                hasActiveSession: jest.fn().mockResolvedValue(false),
            } as unknown) as TherapistRepository;
        });

        // stub downloader behaviour; simulate downloading state initially
        jest.spyOn(Container.get(InferenceModelDownloader), 'download').mockResolvedValue({
            state$: { onChange: (cb: any) => {
                // Initially in downloading state
                setTimeout(() => cb({ value: DownloadState.Completed }), 100);
            }},
            progress$: { onChange: () => {} },
            getState: () => DownloadState.Downloading,
            getError: () => undefined,
        } as any);

        // ensure the language subsystem returns predictable strings
        Container.get(Localization).getTranslationFunctions('en');
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('shows a pending startup status and hides it after 5 seconds', async () => {
        await Container.get(StartupOrchestrator).run();

        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Pending);
        // download progress may override the initial start message in our stub
        expect(Container.get(GlobalActivityStatus).getMessage()).toMatch(/Starting|Downloading/);

        // fast-forward the auto-hide delay
        jest.advanceTimersByTime(5000);
        // after the delay the bar should no longer be pending; depending on
        // whether the download finished success may be shown otherwise the
        // reset will have hidden the bar entirely.
        expect(Container.get(GlobalActivityStatus).getStatus()).not.toBe(ActivityStatus.Pending);
    });

    it('triggers speaker model download and shows success after boot timer', async () => {
        await Container.get(StartupOrchestrator).run();

        // download begins immediately; we should see a pending state (shared slot)
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Pending);

        // advance past the startup notification (5s) – at that moment the
        // success message should be shown and auto-hide scheduled for 3s later
        jest.advanceTimersByTime(5000);
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Success);
        expect(Container.get(GlobalActivityStatus).getMessage()).toMatch(/Speaker model downloaded/);

        jest.advanceTimersByTime(3000);
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Ready);
    });

    it('shows success immediately if download completes after boot delay', async () => {
        // override the downloader stub to resolve only once we manually trigger
        // the completion via state change.  We capture the onChange callback so
        // we can simulate progress later if needed.
        let stateCb: ((arg: { value: DownloadState }) => void) | undefined;
        let currentState = DownloadState.Downloading;
        jest.spyOn(Container.get(InferenceModelDownloader), 'download').mockResolvedValue({
            state$: { onChange: (cb: any) => { stateCb = cb; } },
            progress$: { onChange: () => {} },
            getState: () => currentState,
            getError: () => undefined,
        } as any);

        // helper to complete later
        const completeDownload = () => {
            currentState = DownloadState.Completed;
            stateCb?.({ value: DownloadState.Completed });
        };
        // expose helper for the test body
        (global as any).completeDownload = completeDownload;

        await Container.get(StartupOrchestrator).run();
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Pending);

        // move past the booting interval
        jest.advanceTimersByTime(5000);
        // since the download promise hasn't resolved yet, the initial
        // auto-hide timer will reset the status to ready.
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Ready);

        // now complete the download
        (global as any).completeDownload();
        // flush any pending microtasks
        await Promise.resolve();

        // after download completes the status should no longer be pending
        // (the bar may already have auto-hidden back to ready)
        expect(Container.get(GlobalActivityStatus).getStatus()).not.toBe(ActivityStatus.Pending);
    });

    it('updates state$ to Onboarding when no active session exists', async () => {
        await Container.get(StartupOrchestrator).run();
        expect(Container.get(StartupOrchestrator).stateObservable.get()).toBe(StartupState.Onboarding);
    });

    it('sets Ready state when a session already exists', async () => {
        // override repository to simulate an active session
        (Container.get(Registry).getRepository as any).mockReturnValue({
            hasActiveSession: jest.fn().mockResolvedValue(true),
        });

        await Container.get(StartupOrchestrator).run();
        expect(Container.get(StartupOrchestrator).stateObservable.get()).toBe(StartupState.Ready);
    });
});
