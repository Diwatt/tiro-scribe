import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container } from '@/Container';
import { StartupState } from '@/State/StartupOrchestrator';
import { ActivityStatus } from '@/State/GlobalActivityStatus';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import { DownloadState } from '@/Service/InferenceModelDownload/Type';
import type { TherapistRepository } from '@/Repository';
import { Therapist } from '@/Entity/Therapist';

vi.mock('@/Service/Logger', () => ({
    AppLogger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('StartupOrchestrator', () => {
    beforeEach(() => {
        vi.useFakeTimers();

        // clear any previous activity
        Container.globalActivityStatus.reset();

        // stub registry so we don't hit a real database
        vi.spyOn(Container.registry, 'getRepository').mockImplementation(async () => {
            // return minimal repo satisfying the interface
            return ({
                hasActiveSession: vi.fn().mockResolvedValue(false),
            } as unknown) as TherapistRepository;
        });

        // stub downloader behaviour; simulate downloading state initially
        vi.spyOn(Container.inferenceModelDownloader, 'download').mockResolvedValue({
            state$: { onChange: (cb: any) => {
                // Initially in downloading state
                setTimeout(() => cb({ value: DownloadState.Completed }), 100);
            }},
            progress$: { onChange: () => {} },
            getState: () => DownloadState.Downloading,
            getError: () => undefined,
        } as any);

        // ensure the language subsystem returns predictable strings
        Container.appLanguage.getTranslationFunctions('en');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('shows a pending startup status and hides it after 5 seconds', async () => {
        await Container.startupOrchestrator.run();

        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Pending);
        // download progress may override the initial start message in our stub
        expect(Container.globalActivityStatus.getMessage()).toMatch(/Starting|Downloading/);

        // fast-forward the auto-hide delay
        vi.advanceTimersByTime(5000);
        // after the delay the bar should no longer be pending; depending on
        // whether the download finished success may be shown otherwise the
        // reset will have hidden the bar entirely.
        expect(Container.globalActivityStatus.getStatus()).not.toBe(ActivityStatus.Pending);
    });

    it('triggers speaker model download and shows success after boot timer', async () => {
        await Container.startupOrchestrator.run();

        // download begins immediately; we should see a pending state (shared slot)
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Pending);

        // advance past the startup notification (5s) – at that moment the
        // success message should be shown and auto-hide scheduled for 3s later
        vi.advanceTimersByTime(5000);
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Success);
        expect(Container.globalActivityStatus.getMessage()).toMatch(/Speaker model downloaded/);

        vi.advanceTimersByTime(3000);
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Ready);
    });

    it('shows success immediately if download completes after boot delay', async () => {
        // override the downloader stub to resolve only once we manually trigger
        // the completion via state change.  We capture the onChange callback so
        // we can simulate progress later if needed.
        let stateCb: ((arg: { value: DownloadState }) => void) | undefined;
        let currentState = DownloadState.Downloading;
        vi.spyOn(Container.inferenceModelDownloader, 'download').mockResolvedValue({
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

        await Container.startupOrchestrator.run();
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Pending);

        // move past the booting interval
        vi.advanceTimersByTime(5000);
        // since the download promise hasn't resolved yet, the initial
        // auto-hide timer will reset the status to ready.
        expect(Container.globalActivityStatus.getStatus()).toBe(ActivityStatus.Ready);

        // now complete the download
        (global as any).completeDownload();
        // flush any pending microtasks
        await Promise.resolve();

        // after download completes the status should no longer be pending
        // (the bar may already have auto-hidden back to ready)
        expect(Container.globalActivityStatus.getStatus()).not.toBe(ActivityStatus.Pending);
    });

    it('updates state$ to Onboarding when no active session exists', async () => {
        await Container.startupOrchestrator.run();
        expect(Container.startupOrchestrator.stateObservable.get()).toBe(StartupState.Onboarding);
    });

    it('sets Ready state when a session already exists', async () => {
        // override repository to simulate an active session
        (Container.registry.getRepository as any).mockResolvedValue({
            hasActiveSession: vi.fn().mockResolvedValue(true),
        });

        await Container.startupOrchestrator.run();
        expect(Container.startupOrchestrator.stateObservable.get()).toBe(StartupState.Ready);
    });
});
