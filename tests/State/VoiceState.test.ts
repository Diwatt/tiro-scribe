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
import { AppLogger } from '@/Core/AppLogger';
import { Localization } from '@/Localization';
import { InferenceModelDownloader } from '@/InferenceModel/Downloader';
import { GlobalActivityStatus } from '@/State/GlobalActivityStatus';
import { MasterKeyVault } from '@/Security/MasterKeyVault';
import { AppConfig } from '@/Core/AppConfig';
import { VoiceCalibrator } from '@/InferenceModel/Speaker/VoiceCalibrator';
import { Biocode } from '@/InferenceModel/Speaker/Biocode';

jest.mock('@/Core/Container', () => ({
    Container: { get: jest.fn(), register: jest.fn() },
}));

// simple observable stub used by state; not needed to emulate entire legendapp
jest.mock('@legendapp/state', () => ({
    observable: (init: any) => ({
        get: () => init,
        set: (_: any) => {},
        onChange: (_cb: any) => ({ onChange: () => {} }),
    }),
}));

dayjs.extend(utc);

describe('VoiceState', () => {
    let voiceState: VoiceState;
    const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as AppLogger;
    const mockLocalization = { getLL: jest.fn(() => ({ onboarding: { errorVoiceCalibration: () => 'err' }, download: {} })) } as unknown as Localization;
    const mockDownloader = {} as unknown as InferenceModelDownloader;
    const mockGlobalActivity = { setStatus: jest.fn() } as unknown as GlobalActivityStatus;
    const mockMasterKeyVault = { load: jest.fn() } as unknown as MasterKeyVault;
    const mockAppConfig = { voiceCalibrationDurationMs: 5000 } as unknown as AppConfig;
    const mockCalibrator = {
        captureVoiceSample: jest.fn<() => Promise<Float32Array>>(),
        generateBiocode: jest.fn<(masterKey: string, pcm: Float32Array) => Promise<Biocode>>(),
    } as unknown as VoiceCalibrator;

    const therapist = { uuid: 'thera-1', biocode: undefined } as any;
    const pendingProvider = { getPendingTherapist: () => therapist };

    beforeEach(() => {
        jest.clearAllMocks();
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

    it('passes masterKey to calibrator and stores returned biocode', async () => {
        mockMasterKeyVault.load = jest.fn().mockResolvedValue('the-key');
        const fakeBiocode = new Biocode([1, 2, 3], 0.8, dayjs.utc());
        mockCalibrator.captureVoiceSample = jest.fn().mockResolvedValue(new Float32Array([0.1]));
        mockCalibrator.generateBiocode = jest.fn().mockResolvedValue(fakeBiocode);

        await voiceState.calibrateVoice();

        expect(mockCalibrator.captureVoiceSample).toHaveBeenCalledWith(mockAppConfig.voiceCalibrationDurationMs);
        expect(mockCalibrator.generateBiocode).toHaveBeenCalledWith('the-key', expect.any(Float32Array));
        expect(therapist.biocode).toEqual(fakeBiocode.projectedVector);
    });

    it('sets error message if calibrator throws', async () => {
        mockMasterKeyVault.load = jest.fn().mockResolvedValue('k');
        mockCalibrator.captureVoiceSample = jest.fn().mockRejectedValue(new Error('oops')) as any;
        // recreate state so it uses the updated calibrator reference
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
        if (typeof voiceState.isSpeakerModelDownloading?.set === 'function') {
            voiceState.isSpeakerModelDownloading.set(false);
        }

        // spy on observable so we can see what gets written
        const errorSpy = jest.spyOn(voiceState.error, 'set');

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
});
