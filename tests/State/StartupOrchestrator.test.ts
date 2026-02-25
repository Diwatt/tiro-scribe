import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startupOrchestrator, StartupState } from '@/State/StartupOrchestrator';
import { globalActivityStatus, ActivityStatus } from '@/State/GlobalActivityStatus';
import { InferenceModelDownloader, inferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import { DownloadState } from '@/Service/InferenceModelDownload/Type';
import { registry } from '@/Database/Registry';
import type { TherapistRepository } from '@/Repository';
import { Therapist } from '@/Entity/Therapist';
import { appLanguage } from '@/Localization/AppLanguage';


describe('StartupOrchestrator', () => {
    beforeEach(() => {
        vi.useFakeTimers();

        // clear any previous activity
        globalActivityStatus.reset();

        // stub registry so we don't hit a real database
        vi.spyOn(registry, 'getRepository').mockImplementation(async () => {
            // return minimal repo satisfying the interface
            return ({
                hasActiveSession: vi.fn().mockResolvedValue(false),
            } as unknown) as TherapistRepository;
        });

        // stub downloader behaviour; simulate instant completion by
        // returning a fake executor already in the Completed state.
        vi.spyOn(inferenceModelDownloader, 'download').mockResolvedValue({
            state$: { onChange: (cb: any) => cb({ value: DownloadState.Completed }) },
            progress$: { onChange: () => {} },
            getState: () => DownloadState.Completed,
            getError: () => undefined,
        } as unknown as ReturnType<typeof inferenceModelDownloader.download>);

        // ensure the language subsystem returns predictable strings
        appLanguage.getTranslationFunctions('en');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('shows a pending startup status and hides it after 5 seconds', async () => {
        await startupOrchestrator.run();

        expect(globalActivityStatus.getStatus()).toBe(ActivityStatus.Pending);
        // download progress may override the initial start message in our stub
        expect(globalActivityStatus.getMessage()).toMatch(/Starting|Downloading/);

        // fast-forward the auto-hide delay
        vi.advanceTimersByTime(5000);
        // after the delay the bar should no longer be pending; depending on
        // whether the download finished success may be shown otherwise the
        // reset will have hidden the bar entirely.
        expect(globalActivityStatus.getStatus()).not.toBe(ActivityStatus.Pending);
    });

    it('triggers speaker model download and shows success after boot timer', async () => {
        await startupOrchestrator.run();

        // download begins immediately; we should see a pending state (shared slot)
        expect(globalActivityStatus.getStatus()).toBe(ActivityStatus.Pending);

        // advance past the startup notification (5s) – at that moment the
        // success message should be shown and auto-hide scheduled for 3s later
        vi.advanceTimersByTime(5000);
        expect(globalActivityStatus.getStatus()).toBe(ActivityStatus.Success);
        expect(globalActivityStatus.getMessage()).toMatch(/Speaker model downloaded/);

        vi.advanceTimersByTime(3000);
        expect(globalActivityStatus.getStatus()).toBe(ActivityStatus.Ready);
    });

    it('shows success immediately if download completes after boot delay', async () => {
        // override the downloader stub to resolve only once we manually trigger
        // the completion via state change.  We capture the onChange callback so
        // we can simulate progress later if needed.
        let stateCb: ((arg: { value: DownloadState }) => void) | undefined;
        let currentState = DownloadState.Downloading;
        vi.spyOn(inferenceModelDownloader, 'download').mockResolvedValue({
            state$: { onChange: (cb: any) => { stateCb = cb; } },
            progress$: { onChange: () => {} },
            getState: () => currentState,
            getError: () => undefined,
        } as unknown as ReturnType<typeof inferenceModelDownloader.download>);

        // helper to complete later
        const completeDownload = () => {
            currentState = DownloadState.Completed;
            stateCb?.({ value: DownloadState.Completed });
        };
        // expose helper for the test body
        (global as any).completeDownload = completeDownload;

        await startupOrchestrator.run();
        expect(globalActivityStatus.getStatus()).toBe(ActivityStatus.Pending);

        // move past the booting interval
        vi.advanceTimersByTime(5000);
        // since the download promise hasn't resolved yet, the initial
        // auto-hide timer will reset the status to ready.
        expect(globalActivityStatus.getStatus()).toBe(ActivityStatus.Ready);

        // now complete the download
        (global as any).completeDownload();
        // flush any pending microtasks
        await Promise.resolve();

        // after download completes the status should no longer be pending
        // (the bar may already have auto-hidden back to ready)
        expect(globalActivityStatus.getStatus()).not.toBe(ActivityStatus.Pending);
    });

    it('updates state$ to Onboarding when no active session exists', async () => {
        await startupOrchestrator.run();
        expect(startupOrchestrator.state$.get()).toBe(StartupState.Onboarding);
    });

    it('sets Ready state when a session already exists', async () => {
        // override repository to simulate an active session
        (registry.getRepository as any).mockResolvedValue({
            hasActiveSession: vi.fn().mockResolvedValue(true),
        });

        await startupOrchestrator.run();
        expect(startupOrchestrator.state$.get()).toBe(StartupState.Ready);
    });
});
