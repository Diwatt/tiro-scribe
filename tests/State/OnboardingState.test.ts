
jest.mock('@legendapp/state', () => jest.requireActual('../stubs/LegendAppStateStub'));

// prevent native/expo modules from being bundled during unit tests
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
import { Container } from '@/Core/Container';
import { DownloadState } from '@/InferenceModel/Download/Type';
import { Downloader } from '@/InferenceModel/Downloader';
import { Localization } from '@/Localization';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { OnboardingState } from '@/State/Onboarding/State';
import { OnboardingStep } from '@/State/Onboarding/Types';

describe('OnboardingState', () => {
    beforeEach(() => {
        // replace downloader with a lightweight fake so ensureSpeakerModel()
        // always enters its download branch (never hits config/artifact storage)
        Container.register(Downloader, () => {
            return {
                getLocalPath: (_capability: string) => undefined,
                download: jest.fn(),
            } as unknown as Downloader;
        });

        jest.useFakeTimers();
        Container.get(GlobalActivityStatus).reset();

        // ensure we start with a fresh state
        Container.get(OnboardingState).reset();

        // stub downloader behaviour; simulate downloading then completion
        jest.spyOn(Container.get(Downloader), 'download').mockResolvedValue({
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
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('starts the speaker-model download when entering the voice step', async () => {
        const state = Container.get(OnboardingState);

        state.goToStep(OnboardingStep.Voice);
        // let the microtasks queued by ensureSpeakerModel() run before asserting
        await Promise.resolve();
        await Promise.resolve();

        expect(state.voice.isSpeakerModelDownloading.get()).toBe(true);
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Pending);
    });

    it('marks the speaker model ready when the download completes', async () => {
        const state = Container.get(OnboardingState);

        state.goToStep(OnboardingStep.Voice);
        await Promise.resolve();
        await Promise.resolve();

        // fire the simulated download completion
        jest.advanceTimersByTime(100);
        await jest.runAllTimersAsync();

        expect(state.voice.isSpeakerModelDownloading.get()).toBe(false);
        expect(state.voice.isSpeakerModelReady.get()).toBe(true);
    });

    it('calibrateVoice does not start calibration while the model is downloading', async () => {
        const state = Container.get(OnboardingState);

        state.goToStep(OnboardingStep.Voice);
        await Promise.resolve();
        await Promise.resolve();
        expect(state.voice.isSpeakerModelDownloading.get()).toBe(true);

        await state.voice.calibrateVoice();

        expect(state.voice.isBusy.get()).toBe(false);
        expect(state.voice.error.get()).toBeUndefined();
    });

    it('calibrateVoice does not trigger the speaker model download', async () => {
        const state = Container.get(OnboardingState);
        const ensureSpeakerModel = jest.spyOn(state.voice, 'ensureSpeakerModel');
        // allow calibration to proceed (downloading flag off, permission granted)
        state.voice.isSpeakerModelDownloading.set(false);
        state.voice.hasPermission.set(true);

        await state.voice.calibrateVoice();

        expect(ensureSpeakerModel).not.toHaveBeenCalled();
    });

    it('calibrateVoice sets the localized error message when calibration fails', async () => {
        const state = Container.get(OnboardingState);
        // allow calibration to proceed; no pending therapist makes it fail
        state.voice.isSpeakerModelDownloading.set(false);
        state.voice.hasPermission.set(true);

        await state.voice.calibrateVoice();

        const ll = Container.get(Localization).getLL();
        expect(state.error.get()).toBe(ll.onboarding.errorVoiceCalibration());
    });

    it('runAsyncAction toggles the busy flag around the action', async () => {
        const state = Container.get(OnboardingState);

        await state.voice['runAsyncAction'](async () => {
            expect(state.voice.isBusy.get()).toBe(true);
        });

        expect(state.voice.isBusy.get()).toBe(false);
    });
});
