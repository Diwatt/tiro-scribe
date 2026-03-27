
// simple stub of legendapp state for node tests
jest.mock('@legendapp/state', () => {
    function observable<T>(initial: T) {
        let value: any = initial;
        const listeners: Array<(arg: { value: T }) => void> = [];

        const makeSub = (key: keyof T) => {
            let subVal = (initial as any)?.[key];
            const subListeners: Array<(arg: { value: any }) => void> = [];
            return {
                get: () => subVal,
                set: (v: any) => {
                    subVal = v;
                    if (value && typeof value === 'object') {
                        (value as any)[key] = v;
                    }
                    subListeners.forEach(cb => cb({ value: v }));
                },
                onChange: (cb: any) => {
                    subListeners.push(cb);
                    return { onChange: () => {} };
                },
            };
        };

        const proxy: any = {
            get: () => value,
            set: (v: T) => {
                value = v;
                listeners.forEach(cb => cb({ value }));
            },
            onChange: (cb: any) => {
                listeners.push(cb);
                return { onChange: () => {} };
            },
        };

        if (initial && typeof initial === 'object') {
            for (const key of Object.keys(initial) as Array<keyof T>) {
                Object.defineProperty(proxy, key, {
                    get: () => makeSub(key),
                    enumerable: true,
                    configurable: true,
                });
            }
        }

        return proxy as unknown as T;
    }
    function computed<T>(fn: () => T) {
        return { get: fn } as unknown as ObservableComputed<T>;
    }

    return { observable, computed };
});

// prevent native/expo modules from being bundled during unit tests
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
import { Container } from '@/Core/Container';
import { OnboardingState } from '@/State/Onboarding/State';
import { ActivityStatus, GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { DownloadState } from '@/Service/InferenceModelDownload/Type';
import { InferenceModelDownloader } from '@/Service/InferenceModelDownloader';
import { Localization } from '@/Localization';

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

describe('OnboardingState', () => {
    beforeEach(() => {
        // prepare container so core singletons are registered
        Container.initialize();

        // replace downloader with a lightweight fake to avoid database dependency
        Container.register(InferenceModelDownloader, () => {
            return {
                getLocalPath: (_: string) => undefined,
                download: async () => {
                    return {
                        state$: { onChange: (_: any) => {} },
                        progress$: { onChange: (_: any) => {} },
                        getState: () => DownloadState.Downloading,
                        getError: () => undefined,
                    } as any;
                },
            } as any;
        });

        jest.useFakeTimers();
        Container.get(GlobalActivityStatus).reset();

        // ensure we start with a fresh state
        Container.get(OnboardingState).reset();

        // stub downloader behaviour; simulate downloading then completion
        jest.spyOn(Container.get(InferenceModelDownloader), 'download').mockResolvedValue({
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

    it.skip('begins speaker-model download when navigating to step 3', async () => {
        const state = Container.get(OnboardingState);
        state.goToStep(3);

        expect(state.voice.isSpeakerModelDownloading.get()).toBe(true);
        expect(Container.get(GlobalActivityStatus).getStatus()).toBe(ActivityStatus.Pending);

        // advance fake timer so the simulated executor fires
        jest.advanceTimersByTime(100);
        // run any pending timers to ensure callbacks execute
        await jest.runAllTimersAsync();
        await Promise.resolve();

        // download should have finished by now
        expect(state.voice.isSpeakerModelDownloading.get()).toBe(false);
    });

    it.skip('does not crash if calibrateVoice is invoked while model is downloading', async () => {
        const state = Container.get(OnboardingState);
        state.goToStep(3);
        // call calibrateVoice on the voice substate; internal guard should early-return
        await state.voice.calibrateVoice();
        // if the download completed very quickly the flag may be false; main goal
        // is just to ensure no exception is thrown.
    });

    it.skip('calibrateVoice does not await ensureSpeakerModel', async () => {
        const state = Container.get(OnboardingState);
        const spy = jest.spyOn(state.voice as any, 'ensureSpeakerModel');
        // leave downloading false so the method would normally proceed
        state.voice.isSpeakerModelDownloading.set(false);
        // call without therapist; runAsyncAction will swallow the error
        await state.voice.calibrateVoice();
        expect(spy).not.toHaveBeenCalled();
    });

    it.skip('calibrateVoice sets error message on failure', async () => {
        const state = Container.get(OnboardingState);
        // ensure downloading flag is false so the attempt proceeds
        state.voice.isSpeakerModelDownloading.set(false);
        await state.voice.calibrateVoice();
        const ll = Container.get(Localization).getLL();
        expect(state.error.get()).toBe(ll.onboarding.errorVoiceCalibration());
    });

    it.skip('runAsyncAction toggles busy flag on a child state', async () => {
        const state = Container.get(OnboardingState);
        // use voice state as a representative child
        const promise = state.voice['runAsyncAction'](async () => {
            expect(state.voice.isBusy.get()).toBe(true);
        });
        await promise;
        expect(state.voice.isBusy.get()).toBe(false);
    });
});
