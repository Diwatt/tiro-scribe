// ensure logger is stubbed so ctor default works
vi.mock('@/Service/Logger', () => {
    return {
        appLogger: {
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        },
    };
});

import { RawAudioStreamer } from '../../src/Service/RawAudioStreamer';
import * as Audio from 'expo-audio';

vi.mock('expo-audio', () => {
    // simple class that stores the last-created instance for our assertions
    class MockRecorder {
        static lastInstance: any;
        constructor(options: any) {
            MockRecorder.lastInstance = this;
        }

        prepareToRecordAsync = vi.fn(async () => {});
        record = vi.fn(() => {});
        stop = vi.fn(async () => {});
        addListener = vi.fn((event: string, cb: any) => {
            return { remove: vi.fn() };
        });
    }

    return {
        requestRecordingPermissionsAsync: vi.fn(async () => ({ granted: true })),
        setAudioModeAsync: vi.fn(async () => {}),
        AudioModule: {
            AudioRecorder: MockRecorder,
        },
        // expose class so tests can inspect lastInstance
        __mockRecorderClass: MockRecorder,
    };
});

describe('RawAudioStreamer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts recorder, emits frames and stops correctly', async () => {
        const callback = vi.fn();
        await RawAudioStreamer.start(callback);

        expect(Audio.requestRecordingPermissionsAsync).toHaveBeenCalled();
        expect(Audio.setAudioModeAsync).toHaveBeenCalled();

        // grab the instance that was created by our mock class
        const recorderInstance = (Audio as any).__mockRecorderClass.lastInstance;
        expect(recorderInstance).toBeDefined();
        expect(recorderInstance.prepareToRecordAsync).toHaveBeenCalled();
        expect(recorderInstance.record).toHaveBeenCalled();

        // simulate a sample event
        const sampleListener = recorderInstance.addListener.mock.calls[0][1];
        sampleListener({ audioSample: { channels: [{ frames: [0.5, -0.5] }] } });
        expect(callback).toHaveBeenCalledWith(new Float32Array([0.5, -0.5]));

        // calling start again should not recreate recorder instance
        const firstInstance = recorderInstance;
        await RawAudioStreamer.start(callback);
        const secondInstance = (Audio as any).__mockRecorderClass.lastInstance;
        expect(secondInstance).toBe(firstInstance);

        await RawAudioStreamer.stop();
        expect(recorderInstance.stop).toHaveBeenCalled();
    });

    it('stop is safe when not started', async () => {
        await RawAudioStreamer.stop();
        await RawAudioStreamer.stop();
    });
});
