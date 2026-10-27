import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

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
        return { get: fn } as unknown as { get: () => T };
    }

    return { observable, computed };
});

import { VoiceState } from '@/State/Onboarding/VoiceState';
import type { PendingTherapistProvider } from '@/State/Onboarding/Types';
import { AppLogger } from '@/Core/AppLogger';
import { Localization } from '@/Localization';
import { Downloader } from '@/InferenceModel/Downloader';
import { DownloadState } from '@/InferenceModel/Download/Type';
import { GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { AppConfig } from '@/Core/AppConfig';
import { VoiceCalibrator } from '@/InferenceModel/Speaker/VoiceCalibrator';
import { Biocode } from '@/InferenceModel/Speaker/Biocode';

jest.mock('@/Core/Container', () => ({
    Container: { get: jest.fn(), register: jest.fn() },
}));

dayjs.extend(utc);

describe('VoiceState', () => {
    let voiceState: VoiceState;
    const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as AppLogger;
    const mockLocalization = {
        getLL: jest.fn(() => ({
            onboarding: { errorVoiceCalibration: () => 'err' },
            download: {
                speakerModel: () => 'Speaker model',
                speakerModelSuccess: () => 'Speaker model ready',
                speakerModelError: () => 'Speaker model failed',
            },
        })),
    } as unknown as Localization;
    const mockDownloader = {} as unknown as Downloader;
    const mockGlobalActivity = { setStatus: jest.fn() } as unknown as GlobalActivityStatus;
    const mockMasterKeyVault = { load: jest.fn() } as unknown as MasterKeyVault;
    const mockAppConfig = { voiceCalibrationDurationMs: 5000 } as unknown as AppConfig;
    const mockCalibrator = {
        captureVoiceSample: jest.fn<Promise<Float32Array>, []>(),
        generateBiocode: jest.fn<Promise<Biocode>, [string, Float32Array]>(),
    } as unknown as VoiceCalibrator;

    let therapist: { uuid: string; biocode: unknown };
    const pendingProvider = { getPendingTherapist: () => therapist } as unknown as PendingTherapistProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        therapist = { uuid: 'thera-1', biocode: undefined };
        voiceState = new VoiceState(
            mockLogger,
            mockLocalization,
            mockDownloader,
            mockGlobalActivity,
            mockMasterKeyVault,
            mockAppConfig,
            mockCalibrator,
        );
        voiceState.setPendingTherapistProvider(pendingProvider);
        // make sure download flag is false so calibration will proceed
        if (typeof voiceState.isSpeakerModelDownloading?.set === 'function') {
            voiceState.isSpeakerModelDownloading.set(false);
        }
    });

    it('sets error message if calibrator throws', async () => {
        mockMasterKeyVault.load = jest.fn().mockResolvedValue('k');
        mockCalibrator.captureVoiceSample = jest.fn().mockRejectedValue(new Error('oops')) as any;

        // spy on observable so we can see what gets written
        const errorSpy = jest.spyOn(voiceState.error, 'set');

        // grant permission so the method proceeds past the guard
        voiceState.hasPermission.set(true);

        await voiceState.calibrateVoice();
        // ensure any observable notifications or timer callbacks propagate
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCalibrator.captureVoiceSample).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
            '[VoiceState] calibrateVoice failed',
            expect.objectContaining({ error: expect.anything(), message: expect.any(String) }),
        );

        // make sure the error setter was invoked and record its argument
        expect(errorSpy).toHaveBeenCalled();
        const calledWith = errorSpy.mock.calls[errorSpy.mock.calls.length - 1][0];
        const ll = mockLocalization.getLL();
        expect(calledWith).toBe(ll.onboarding.errorVoiceCalibration());
        // we don't assert on `error.get()` because the observable stub does not
        // always reflect changes synchronously; verifying the setter call is
        // sufficient to exercise the error path.
    });

    describe('Permission Gate', () => {
        const { SecureRecorder } = require('secure-recorder');

        beforeEach(() => {
            jest.clearAllMocks();
            // Reset permission state
            if (typeof voiceState.hasPermission?.set === 'function') {
                voiceState.hasPermission.set(false);
            }
            if (typeof voiceState.isSpeakerModelDownloading?.set === 'function') {
                voiceState.isSpeakerModelDownloading.set(false);
            }
        });

        it('checkPermission sets hasPermission to true when granted', async () => {
            jest.spyOn(SecureRecorder, 'hasPermission').mockResolvedValue(true);

            await voiceState.checkPermission();

            expect(SecureRecorder.hasPermission).toHaveBeenCalled();
            expect(voiceState.hasPermission.get()).toBe(true);
        });

        it('checkPermission sets hasPermission to false when denied', async () => {
            jest.spyOn(SecureRecorder, 'hasPermission').mockResolvedValue(false);

            await voiceState.checkPermission();

            expect(SecureRecorder.hasPermission).toHaveBeenCalled();
            expect(voiceState.hasPermission.get()).toBe(false);
        });

        it('requestPermission sets hasPermission to true when granted', async () => {
            jest.spyOn(SecureRecorder, 'requestPermission').mockResolvedValue(true);

            await voiceState.requestPermission();

            expect(SecureRecorder.requestPermission).toHaveBeenCalled();
            expect(voiceState.hasPermission.get()).toBe(true);
        });

        it('requestPermission sets hasPermission to false when denied', async () => {
            jest.spyOn(SecureRecorder, 'requestPermission').mockResolvedValue(false);

            await voiceState.requestPermission();

            expect(SecureRecorder.requestPermission).toHaveBeenCalled();
            expect(voiceState.hasPermission.get()).toBe(false);
        });

        it('calibrateVoice should return early if permission not granted', async () => {
            // Set permission to false
            if (typeof voiceState.hasPermission?.set === 'function') {
                voiceState.hasPermission.set(false);
            }

            mockMasterKeyVault.load = jest.fn().mockResolvedValue('key');
            mockCalibrator.captureVoiceSample = jest.fn();

            await voiceState.calibrateVoice();

            // Should not call captureVoiceSample since permission is denied
            expect(mockCalibrator.captureVoiceSample).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith(
                '[VoiceState] calibrateVoice called without permission',
            );
        });

        it('calibrateVoice should proceed when permission is granted', async () => {
            // Set permission to true
            if (typeof voiceState.hasPermission?.set === 'function') {
                voiceState.hasPermission.set(true);
            }

            mockMasterKeyVault.load = jest.fn().mockResolvedValue('the-key');
            const fakeBiocode = new Biocode([1, 2, 3], 0.8, dayjs.utc());
            mockCalibrator.captureVoiceSample = jest.fn().mockResolvedValue(new Float32Array([0.1]));
            mockCalibrator.generateBiocode = jest.fn().mockResolvedValue(fakeBiocode);

            await voiceState.calibrateVoice();

            expect(mockCalibrator.captureVoiceSample).toHaveBeenCalledWith(mockAppConfig.voiceCalibrationDurationMs);
            expect(mockCalibrator.generateBiocode).toHaveBeenCalledWith('the-key', expect.any(Float32Array));
            expect(therapist.biocode).toEqual(fakeBiocode.projectedVector);
        });

        it('reset clears hasPermission', () => {
            voiceState.hasPermission.set(true);

            voiceState.reset();

            expect(voiceState.hasPermission.get()).toBe(false);
        });
    });

    describe('ensureSpeakerModel', () => {
        type StateHandler = (event: { value: DownloadState }) => void;

        const setDownloader = (getLocalPath: unknown, download: unknown): void => {
            (mockDownloader as { getLocalPath: unknown }).getLocalPath = getLocalPath;
            (mockDownloader as { download: unknown }).download = download;
        };

        const createExecutor = () => {
            const stateHandlers: StateHandler[] = [];
            const executor = {
                progress$: { onChange: jest.fn() },
                state$: {
                    onChange: jest.fn((handler: StateHandler) => {
                        stateHandlers.push(handler);
                    }),
                },
                getState: jest.fn(() => DownloadState.Downloading),
                getError: jest.fn(),
            };
            const complete = (event: { value: DownloadState }) => {
                stateHandlers.forEach((handler) => handler(event));
            };
            return { executor, complete };
        };

        // Pump microtasks until the orchestrator has subscribed its state handler
        // (one for the progress listener, one for the awaited download promise).
        const waitForStateSubscriptions = async (executor: { state$: { onChange: jest.Mock } }): Promise<void> => {
            for (let rounds = 0; executor.state$.onChange.mock.calls.length < 2 && rounds < 100; rounds += 1) {
                await Promise.resolve();
            }
        };

        beforeEach(() => {
            setDownloader(jest.fn(), jest.fn());
        });

        it('downloads the speaker model when it is not stored locally', async () => {
            const getLocalPath = jest.fn().mockResolvedValue(null);
            const { executor, complete } = createExecutor();
            const download = jest.fn().mockResolvedValue(executor);
            setDownloader(getLocalPath, download);

            const pending = voiceState.ensureSpeakerModel();
            await waitForStateSubscriptions(executor);
            complete({ value: DownloadState.Completed });

            await expect(pending).resolves.toBeUndefined();
            expect(getLocalPath).toHaveBeenCalledWith('speaker_id');
            expect(download).toHaveBeenCalledWith('speaker_id');
        });

        it('marks the model as ready without downloading when it is stored locally', async () => {
            const getLocalPath = jest.fn().mockResolvedValue('/models/speaker_id/model.onnx');
            const download = jest.fn();
            setDownloader(getLocalPath, download);

            await voiceState.ensureSpeakerModel();

            expect(download).not.toHaveBeenCalled();
            expect(voiceState.isSpeakerModelReady.get()).toBe(true);
        });
    });
});
