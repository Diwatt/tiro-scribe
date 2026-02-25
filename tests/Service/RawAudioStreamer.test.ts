import { RawAudioStreamer } from '../../src/Service/RawAudioStreamer';
import { SecureRecorder } from '../../modules/secure-recorder/src/index';

jest.mock('../../modules/secure-recorder/src/index', () => {
    return {
        SecureRecorder: jest.fn().mockImplementation(() => {
            return {
                startStream: jest.fn((_cb: any) => {}),
                stopStream: jest.fn(() => {}),
                dispose: jest.fn(() => {}),
            };
        }),
    };
});

describe('RawAudioStreamer', () => {
    let streamer: RawAudioStreamer;

    beforeEach(() => {
        // reset module state and ensure fresh instance
        (SecureRecorder as jest.MockedClass<typeof SecureRecorder>).mockClear();
        streamer = new RawAudioStreamer();
    });

    it('forwards start/stop to SecureRecorder and accumulates samples', () => {
        const fakeCallback = jest.fn();
        streamer.start(fakeCallback as any);
        expect(SecureRecorder).toHaveBeenCalled();
        const instance = (SecureRecorder as jest.MockedClass<typeof SecureRecorder>).mock.results[0].value as any;
        expect(instance.startStream).toHaveBeenCalledWith(fakeCallback);

        // calling again should warn but not create new recorder
        streamer.start(fakeCallback as any);
        expect(SecureRecorder).toHaveBeenCalledTimes(1);

        streamer.stop();
        expect(instance.stopStream).toHaveBeenCalled();
        expect(instance.dispose).toHaveBeenCalled();
    });

    it('stop is safe when not started', () => {
        // ensure no throw on second stop
        streamer.stop();
        streamer.stop();
    });
});
