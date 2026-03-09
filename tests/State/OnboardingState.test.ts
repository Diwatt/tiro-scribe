import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Container } from '@/Core/Container';
import { OnboardingState } from '@/State/Onboarding/State';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { DownloadState } from '@/Service/InferenceModelDownload/Type';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import { Localization } from '@/Localization';

vi.mock('@/App/Logger', () => {
    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
    return {
        AppLogger: {
            getInstance: vi.fn(() => mockLogger),
            ...mockLogger,
        },
    };
});

describe('OnboardingState', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Container.get(GlobalActivityStatus).reset();

        // ensure we start with a fresh state
        Container.get(OnboardingState).reset();

        // stub downloader behaviour; simulate downloading then completion
        vi.spyOn(Container.get(InferenceModelDownloader), 'download').mockResolvedValue({
            state$: { onChange: (cb: any) => {
                // transition to completed shortly after
                setTimeout(() => cb({ value: DownloadState.Completed }), 100);
            }},
            progress$: { onChange: (_: any) => {} },
            getState: () => DownloadState.Downloading,
            getError: () => undefined,
        } as any);

        Container.get(Localization).getTranslationFunctions('en');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('begins speaker-model download when navigating to step 3', async () => {
        const state = Container.get(OnboardingState);
        state.goToStep(3);

        expect(state.isSpeakerModelDownloading.get()).toBe(true);
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Pending);

        // progress to completion
        vi.advanceTimersByTime(100);
        await Promise.resolve();

        expect(state.isSpeakerModelReady.get()).toBe(true);
        expect(state.isSpeakerModelDownloading.get()).toBe(false);
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Success);
    });

    it('does not crash if calibrateVoice is invoked while model is downloading', async () => {
        const state = Container.get(OnboardingState);
        state.goToStep(3);
        // call calibrateVoice; internal guard should early-return
        await state.calibrateVoice();
        // still downloading
        expect(state.isSpeakerModelDownloading.get()).toBe(true);
    });

    it('calibrateVoice does not await ensureSpeakerModel', async () => {
        const state = Container.get(OnboardingState);
        const spy = vi.spyOn(state as any, 'ensureSpeakerModel');
        // leave downloading false so the method would normally proceed
        state.isSpeakerModelDownloading.set(false);
        // call without therapist; runAsyncAction will swallow the error
        await state.calibrateVoice();
        expect(spy).not.toHaveBeenCalled();
    });
});
