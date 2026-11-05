jest.mock('@/Core/Container', () => ({
    Container: {
        register: jest.fn(),
        get: jest.fn(() => undefined),
    },
}));

import { VadPitchSmoke } from '@/DevConsole/State/VadPitchSmoke';
import { SmokeCheckId, SmokeCheckStatus } from '@/DevConsole/Data/SmokeCheck';
import { AudioSegmentExtractor } from '@/DevConsole/Ingest/AudioSegmentExtractor';
import { AppLogger } from '@/Core/AppLogger';
import { PitchEstimate } from '@/InferenceModel/Model';
import { PitchConfig } from '@/InferenceModel/Model/PitchConfig';
import { VadConfig } from '@/InferenceModel/Model/VadConfig';
import type { Pitch } from '@/InferenceModel/Model';
import type { Vad } from '@/InferenceModel/Model';
import type { Runtime } from '@/InferenceModel/Runtime';

const WAV_PATH = '/Documents/speech_thomas_16k.wav';
const WINDOW_SAMPLES = 512;
const FRAME_SAMPLES = 1024;
const SAMPLE_RATE_HZ = 16000;
const EXPECTED_TONES_HZ = [220, 440, 880];

function createFakeVad(voiceProbability: number, silenceProbability: number): Vad {
    return {
        reset: jest.fn(),
        getConfig: () => new VadConfig(SAMPLE_RATE_HZ, WINDOW_SAMPLES, 64, 128),
        run: jest.fn().mockImplementation(async (pcmChunk: Float32Array) => {
            let total = 0;
            for (const sample of pcmChunk) {
                total += Math.abs(sample);
            }
            const isSilence = total / pcmChunk.length < 0.001;
            return isSilence ? silenceProbability : voiceProbability;
        }),
    } as unknown as Vad;
}

function createFakePitch(errorRate: number): Pitch {
    return {
        getConfig: () => new PitchConfig(SAMPLE_RATE_HZ, FRAME_SAMPLES, 360, 20, 31.7, 0.5),
        run: jest.fn().mockImplementation(async (frame: Float32Array) => {
            let peak = 0;
            let risingCrossings = 0;
            for (let index = 1; index < frame.length; index += 1) {
                peak = Math.max(peak, Math.abs(frame[index]));
                if (frame[index - 1] <= 0 && frame[index] > 0) {
                    risingCrossings += 1;
                }
            }
            if (peak < 0.01) {
                return new PitchEstimate(0, 0.01);
            }
            const cycles = Math.round(risingCrossings);
            const hz = (cycles * SAMPLE_RATE_HZ) / frame.length;
            const nearestExpectedTone = EXPECTED_TONES_HZ.reduce((best, tone) =>
                Math.abs(tone - hz) < Math.abs(best - hz) ? tone : best,
            );
            return new PitchEstimate(nearestExpectedTone * (1 + errorRate), 0.9);
        }),
    } as unknown as Pitch;
}

function createFakeRuntime(vad: Vad, pitch: Pitch): Runtime {
    return {
        getModel: jest.fn().mockImplementation(async (capability: string) => {
            if (capability === 'vad') {
                return vad;
            }
            if (capability === 'pitch') {
                return pitch;
            }
            throw new Error(`unexpected capability ${capability}`);
        }),
    } as unknown as Runtime;
}

function createFakeExtractor(samples: number): AudioSegmentExtractor {
    return {
        readFullPcm: jest.fn().mockResolvedValue(new Float32Array(samples).fill(0.25)),
    } as unknown as AudioSegmentExtractor;
}

function createLogger(): AppLogger {
    return { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as AppLogger;
}

function createSmoke(vad: Vad, pitch: Pitch, extractorSamples = WINDOW_SAMPLES * 12): VadPitchSmoke {
    return new VadPitchSmoke(
        createLogger(),
        createFakeRuntime(vad, pitch),
        createFakeExtractor(extractorSamples),
    );
}

function findCheck(smoke: VadPitchSmoke, checkId: SmokeCheckId) {
    const check = smoke.snapshot.checks.find((entry) => entry.id === checkId);
    if (!check) {
        throw new Error(`check ${checkId} missing from snapshot`);
    }
    return check;
}

describe('VadPitchSmoke', () => {
    it('starts with all checks pending and not loading', () => {
        const smoke = createSmoke(createFakeVad(0.95, 0.01), createFakePitch(0));

        expect(smoke.isLoading).toBe(false);
        expect(smoke.snapshot.checks).toHaveLength(6);
        expect(smoke.snapshot.checks.every((check) => check.status === SmokeCheckStatus.Pending)).toBe(true);
        expect(smoke.snapshot.verdict).toBe(SmokeCheckStatus.Pending);
        expect(smoke.snapshot.error).toBeNull();
    });

    it('passes every check when voice is detected, silence is quiet and tones are exact', async () => {
        const smoke = createSmoke(createFakeVad(0.95, 0.01), createFakePitch(0));

        await smoke.run(WAV_PATH);

        expect(smoke.snapshot.verdict).toBe(SmokeCheckStatus.Passed);
        for (const check of smoke.snapshot.checks) {
            expect(check.status).toBe(SmokeCheckStatus.Passed);
        }
    });

    it('reports a failed voice check when speech probability stays low but keeps running the rest', async () => {
        const smoke = createSmoke(createFakeVad(0.2, 0.01), createFakePitch(0));

        await smoke.run(WAV_PATH);

        const voiceCheck = findCheck(smoke, SmokeCheckId.VadVoice);
        expect(voiceCheck.status).toBe(SmokeCheckStatus.Failed);
        expect(voiceCheck.failureReason).toBeTruthy();
        expect(findCheck(smoke, SmokeCheckId.VadSilence).status).toBe(SmokeCheckStatus.Passed);
        expect(smoke.snapshot.verdict).toBe(SmokeCheckStatus.Failed);
    });

    it('reports a failed silence check when silence probability stays high', async () => {
        const smoke = createSmoke(createFakeVad(0.95, 0.9), createFakePitch(0));

        await smoke.run(WAV_PATH);

        const silenceCheck = findCheck(smoke, SmokeCheckId.VadSilence);
        expect(silenceCheck.status).toBe(SmokeCheckStatus.Failed);
        expect(silenceCheck.failureReason).toBeTruthy();
        expect(findCheck(smoke, SmokeCheckId.VadVoice).status).toBe(SmokeCheckStatus.Passed);
    });

    it('fails every tone check when the measured frequency drifts beyond one percent', async () => {
        const smoke = createSmoke(createFakeVad(0.95, 0.01), createFakePitch(0.05));

        await smoke.run(WAV_PATH);

        expect(findCheck(smoke, SmokeCheckId.PitchTone220).status).toBe(SmokeCheckStatus.Failed);
        expect(findCheck(smoke, SmokeCheckId.PitchTone440).status).toBe(SmokeCheckStatus.Failed);
        expect(findCheck(smoke, SmokeCheckId.PitchTone880).status).toBe(SmokeCheckStatus.Failed);
        expect(findCheck(smoke, SmokeCheckId.PitchSilence).status).toBe(SmokeCheckStatus.Passed);
        expect(smoke.snapshot.verdict).toBe(SmokeCheckStatus.Failed);
    });

    it('fails the pitch silence check when silent frames come back voiced', async () => {
        const failingSilencePitch = createFakePitch(0);
        (failingSilencePitch.run as jest.Mock).mockImplementation(async (frame: Float32Array) => {
            let peak = 0;
            for (const sample of frame) {
                peak = Math.max(peak, Math.abs(sample));
            }
            return peak < 0.01 ? new PitchEstimate(320, 0.9) : new PitchEstimate(440, 0.9);
        });
        const smoke = createSmoke(createFakeVad(0.95, 0.01), failingSilencePitch);

        await smoke.run(WAV_PATH);

        const silenceCheck = findCheck(smoke, SmokeCheckId.PitchSilence);
        expect(silenceCheck.status).toBe(SmokeCheckStatus.Failed);
        expect(silenceCheck.failureReason).toBeTruthy();
        expect(findCheck(smoke, SmokeCheckId.PitchTone440).status).toBe(SmokeCheckStatus.Passed);
    });

    it('resets the vad state before the voice stream and before the silence stream', async () => {
        const vad = createFakeVad(0.95, 0.01);
        const smoke = createSmoke(vad, createFakePitch(0));

        await smoke.run(WAV_PATH);

        expect(vad.reset).toHaveBeenCalledTimes(2);
    });

    it('drops the trailing partial window instead of feeding a short one', async () => {
        const vad = createFakeVad(0.95, 0.01);
        const extractorSamples = WINDOW_SAMPLES * 2 + 10;
        const smoke = createSmoke(vad, createFakePitch(0), extractorSamples);

        await smoke.run(WAV_PATH);

        const runs = vad.run as jest.Mock;
        expect(runs).toHaveBeenCalledTimes(2 + VadPitchSmoke.SILENCE_WINDOW_COUNT);
        for (const call of runs.mock.calls) {
            expect(call[0]).toHaveLength(WINDOW_SAMPLES);
        }
    });

    it('rejects empty voice audio without loading any model', async () => {
        const runtime = createFakeRuntime(createFakeVad(0.95, 0.01), createFakePitch(0));
        const smoke = new VadPitchSmoke(createLogger(), runtime, createFakeExtractor(0));

        await expect(smoke.run(WAV_PATH)).rejects.toThrow('Voice audio is empty');
        expect(runtime.getModel).not.toHaveBeenCalled();
        expect(smoke.snapshot.error).toContain('Voice audio is empty');
        expect(smoke.isLoading).toBe(false);
    });

    it('reports the error and stops loading when the vad model fails to load', async () => {
        const runtime = {
            getModel: jest.fn().mockRejectedValue(new Error('download failed')),
        } as unknown as Runtime;
        const smoke = new VadPitchSmoke(createLogger(), runtime, createFakeExtractor(WINDOW_SAMPLES * 12));

        await expect(smoke.run(WAV_PATH)).rejects.toThrow('download failed');

        expect(smoke.snapshot.error).toContain('download failed');
        expect(smoke.isLoading).toBe(false);
    });

    it('runs from the form field set through the setter', async () => {
        const extractor = createFakeExtractor(WINDOW_SAMPLES * 12);
        const smoke = new VadPitchSmoke(
            createLogger(),
            createFakeRuntime(createFakeVad(0.95, 0.01), createFakePitch(0)),
            extractor,
        );
        smoke.setVoiceWavPath(WAV_PATH);

        await smoke.runFromForm();

        expect(extractor.readFullPcm).toHaveBeenCalledWith(WAV_PATH);
    });
});
